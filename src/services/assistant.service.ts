import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { imageUrlFor } from "../lib/serializers.js";
import { PUBLIC_RECIPE } from "./recipes.service.js";
import { stemHebrew } from "../lib/hebrew.js";

// עוזר אישי: מוצא מתכונים לפי מצרכים שכתובים בשפה חופשית.
// מצב בסיסי עובד תמיד. אם הוגדר AI_API_KEY, התשובה מנוסחת על ידי מודל AI,
// ובכל תקלה חוזרים אוטומטית למצב הבסיסי.

const STOP_PHRASES = [
  "מה אפשר להכין",
  "מה אפשר לבשל",
  "מה להכין",
  "מה לבשל",
  "יש לי",
  "יש בבית",
  "נשאר לי",
  "נשארו לי",
  "רק",
  "קצת",
  "הרבה",
  "בבקשה",
  "משהו",
  "עם",
  "בלי",
];


export function extractIngredientTerms(message: string): string[] {
  let text = ` ${message.toLowerCase()} `.replace(/[?!.;:()"'״׳]/g, " ");
  for (const p of STOP_PHRASES) text = text.replaceAll(` ${p} `, " , ");
  const parts = text
    .split(/,|\n|\s+וגם\s+|\s+גם\s+|\s+ו(?=[֐-׿]{2,})/)
    .map((p) => p.trim().replace(/^ו(?=[֐-׿]{3,})/, ""))
    .filter((p) => p.length >= 2 && !/^\d+$/.test(p));
  const terms = parts.map((p) => p.split(/\s+/).filter((w) => w.length >= 2 && !/^\d+$/.test(w)).join(" ")).filter(Boolean);
  // מצרך של כמה מילים: מחפשים לפי המילה הראשונה (למשל "גבינה צהובה" → "גבינ")
  return [...new Set(terms.map((t) => stemHebrew(t.split(" ")[0]!)))].slice(0, 8);
}

interface Found {
  id: number;
  title: string;
  imageUrl: string | null;
  prepTimeMinutes: number | null;
  difficulty: string;
  kosherType: string;
  matchedIngredients: string[];
  matchCount: number;
}

async function findRecipes(terms: string[]): Promise<Found[]> {
  if (terms.length === 0) return [];
  const rows = await prisma.recipe.findMany({
    where: {
      AND: [PUBLIC_RECIPE, { OR: terms.map((t) => ({ ingredients: { some: { text: { contains: t, mode: "insensitive" as const } } } })) }],
    },
    include: { ingredients: { orderBy: { position: "asc" }, select: { text: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows
    .map((r) => {
      const matched = terms.filter((t) => r.ingredients.some((i) => i.text.toLowerCase().includes(t)));
      return {
        id: r.id,
        title: r.title,
        imageUrl: imageUrlFor(r.imagePath),
        prepTimeMinutes: r.prepTimeMinutes,
        difficulty: r.difficulty,
        kosherType: r.kosherType,
        matchedIngredients: r.ingredients.filter((i) => matched.some((t) => i.text.toLowerCase().includes(t))).map((i) => i.text),
        matchCount: matched.length,
        _ingredients: r.ingredients.map((i) => i.text),
      };
    })
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 5)
    .map(({ _ingredients: _ignored, ...rest }) => rest);
}

function basicReply(terms: string[], found: Found[]): string {
  if (terms.length === 0) return "ספרו לי אילו מצרכים יש לכם, למשל: ביצים, קישואים וגבינה, ואמצא מתכונים מתאימים מהאתר.";
  if (found.length === 0) return "לא מצאתי באתר מתכונים עם המצרכים האלה. נסו מצרך אחר, או חפשו בפורום העזרה.";
  const best = found[0]!;
  const full = best.matchCount === terms.length && terms.length > 1 ? " ויש בו את כל המצרכים שציינתם" : "";
  return `מצאתי ${found.length === 1 ? "מתכון אחד מתאים" : `${found.length} מתכונים מתאימים`}. הכי מתאים: "${best.title}"${full}.`;
}

async function aiReply(message: string, found: Found[]): Promise<string | null> {
  if (!env.AI_API_KEY) return null;
  const list = found.length
    ? found.map((f, i) => `${i + 1}. ${f.title} (מצרכים תואמים: ${f.matchedIngredients.join(", ")})`).join("\n")
    : "לא נמצאו מתכונים מתאימים באתר.";
  const prompt =
    "את/ה עוזר/ת בישול באתר שיתוף מתכונים. ענה/י בעברית, בנימוס, בקצרה (עד 4 משפטים).\n" +
    "המלץ/י רק על מתכונים מהרשימה שלמטה, בשמם המדויק. אין להמציא מתכונים שאינם ברשימה.\n" +
    "אם אין מתכונים מתאימים, הצע/י לנסות מצרכים אחרים או לשאול בפורום העזרה של האתר.\n\n" +
    `שאלת המשתמש: ${message}\n\nמתכונים מהאתר:\n${list}`;
  try {
    const res = await fetch(`${env.AI_API_URL}/models/${encodeURIComponent(env.AI_MODEL)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.AI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`AI assistant: provider returned ${res.status}, using basic mode`);
      return null;
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return text ? text.slice(0, 2000) : null;
  } catch (e) {
    console.warn("AI assistant: request failed, using basic mode:", (e as Error).message);
    return null;
  }
}

export async function ask(message: string) {
  const terms = extractIngredientTerms(message);
  const recipes = await findRecipes(terms);
  const ai = await aiReply(message, recipes);
  return {
    mode: ai ? ("ai" as const) : ("basic" as const),
    reply: ai ?? basicReply(terms, recipes),
    detectedIngredients: terms,
    recipes,
  };
}
