// נתוני הדגמה. הרצה: npm run db:seed (פיתוח) או npm run db:seed:prod (אחרי build)
//
// בפיתוח: נוצרים משתמשי דמו עם סיסמאות ידועות (מתועדות ב־README).
// בפרודקשן: נוצרים רק קטגוריות וחשבון מנהל מתוך ADMIN_EMAIL ו־ADMIN_PASSWORD.
// אם SEED_DEMO_DATA=true בפרודקשן, נוצר גם תוכן דמו, אבל למשתמשי הדמו יש סיסמה אקראית
// שאיש לא יודע, כך שאי אפשר להתחבר אליהם.

import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type { Difficulty, KosherType, ModerationStatus, Visibility } from "../src/generated/prisma/enums.js";
import { env } from "../src/config/env.js";
import { hashPassword } from "../src/auth/password.js";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
const isProd = env.NODE_ENV === "production";
const withDemo = env.SEED_DEMO_DATA ?? !isProd;

const CATEGORIES = ["עוגות ומאפים", "לחמים", "ארוחות בוקר", "מרקים", "בשר ועוף", "סלטים", "תוספות", "קינוחים"];

async function upsertUser(email: string, displayName: string, password: string, role: "USER" | "ADMIN", contact?: { contactEmail?: string; contactPhone?: string }) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: { displayName, role, passwordHash, ...contact },
    create: { email, displayName, role, passwordHash, ...contact },
  });
}

interface DemoRecipe {
  title: string;
  description?: string;
  category: string;
  difficulty: Difficulty;
  kosherType: KosherType;
  prepTimeMinutes?: number;
  servings?: number;
  ingredients: string[];
  instructions: string;
  visibility?: Visibility;
  status?: ModerationStatus;
  rejectionReason?: string;
  videoUrl?: string;
  showContact?: boolean;
  author: "noa" | "rivka" | "admin";
  saves?: ("noa" | "rivka" | "admin")[];
}

const RECIPES: DemoRecipe[] = [
  {
    title: "עוגת שמרים שוקולד",
    description: "עוגה רכה ועשירה לשבת",
    category: "עוגות ומאפים",
    difficulty: "MEDIUM",
    kosherType: "DAIRY",
    prepTimeMinutes: 180,
    servings: 12,
    ingredients: ["1 ק\"ג קמח", "50 גרם שמרים טריים", "1 כוס סוכר", "2 ביצים", "200 גרם חמאה", "200 גרם שוקולד מריר", "1.5 כוסות חלב"],
    instructions: "מערבבים את השמרים עם חצי כוס חלב פושר וכף סוכר, ומחכים עשר דקות.\nמוסיפים את שאר המצרכים ולשים בצק רך.\nמתפיחים שעה, מרדדים, ממלאים בשוקולד, מגלגלים ואופים 35 דקות ב־180 מעלות.",
    showContact: true,
    author: "noa",
    saves: ["rivka", "admin"],
  },
  {
    title: "שקשוקה ירוקה",
    description: "ארוחת בוקר מהירה עם ירקות ירוקים",
    category: "ארוחות בוקר",
    difficulty: "EASY",
    kosherType: "DAIRY",
    prepTimeMinutes: 25,
    servings: 4,
    ingredients: ["6 ביצים", "2 קישואים", "חופן תרד", "100 גרם גבינת פטה", "2 כפות שמן זית", "מלח ופלפל"],
    instructions: "מטגנים את הקישואים פרוסים בשמן זית חמש דקות.\nמוסיפים את התרד עד שהוא מתרכך.\nשוברים מעל את הביצים, מכסים ומבשלים עד שהחלבון מתייצב. מפזרים פטה.",
    author: "rivka",
    saves: ["noa"],
  },
  {
    title: "חלה רכה לשבת",
    description: "חלה אוורירית שמחזיקה טריה",
    category: "לחמים",
    difficulty: "MEDIUM",
    kosherType: "PAREVE",
    prepTimeMinutes: 150,
    servings: 2,
    ingredients: ["1 ק\"ג קמח לחם", "25 גרם שמרים יבשים", "1/2 כוס סוכר", "2 ביצים", "1/2 כוס שמן", "1.5 כוסות מים פושרים", "1 כף מלח"],
    instructions: "לשים את כל המצרכים לבצק חלק ורך.\nמתפיחים שעה וחצי, קולעים שתי חלות ומתפיחים שוב חצי שעה.\nמורחים ביצה ואופים 30 דקות ב־180 מעלות.",
    author: "noa",
    saves: ["rivka"],
  },
  {
    title: "מרק עדשים כתומות",
    description: "מרק חורפי מחמם ופשוט",
    category: "מרקים",
    difficulty: "EASY",
    kosherType: "PAREVE",
    prepTimeMinutes: 40,
    servings: 6,
    ingredients: ["2 כוסות עדשים כתומות", "1 בצל", "2 גזרים", "2 תפוחי אדמה", "1 כפית כמון", "8 כוסות מים", "מלח"],
    instructions: "מטגנים את הבצל עד הזהבה.\nמוסיפים את הירקות החתוכים, העדשים, הכמון והמים.\nמבשלים 30 דקות וטוחנים לקרם חלק.",
    author: "rivka",
  },
  {
    title: "עוף בתנור עם תפוחי אדמה",
    description: "מנה עיקרית משפחתית בתבנית אחת",
    category: "בשר ועוף",
    difficulty: "EASY",
    kosherType: "MEAT",
    prepTimeMinutes: 90,
    servings: 6,
    ingredients: ["1 עוף מחולק ל־8", "1 ק\"ג תפוחי אדמה", "1 ראש שום", "3 כפות שמן זית", "1 כף פפריקה מתוקה", "מלח ופלפל"],
    instructions: "מסדרים בתבנית את תפוחי האדמה והעוף.\nמתבלים בשמן, פפריקה, שום, מלח ופלפל.\nאופים מכוסה שעה ב־200 מעלות, ועוד חצי שעה בלי כיסוי.",
    author: "admin",
    saves: ["noa", "rivka"],
  },
  {
    title: "סלט קינואה וירקות",
    category: "סלטים",
    difficulty: "EASY",
    kosherType: "PAREVE",
    prepTimeMinutes: 30,
    servings: 4,
    ingredients: ["1 כוס קינואה", "2 מלפפונים", "2 עגבניות", "1/2 צרור פטרוזיליה", "מיץ מלימון אחד", "3 כפות שמן זית"],
    instructions: "מבשלים את הקינואה לפי ההוראות ומצננים.\nקוצצים את הירקות ומערבבים עם הקינואה, הלימון והשמן.",
    author: "noa",
  },
  {
    title: "פשטידת קישואים",
    description: "פשטידה רכה לארוחת ערב",
    category: "תוספות",
    difficulty: "EASY",
    kosherType: "DAIRY",
    prepTimeMinutes: 60,
    servings: 8,
    ingredients: ["4 קישואים", "4 ביצים", "250 גרם גבינה לבנה", "1 כוס גבינה צהובה מגוררת", "3 כפות קמח", "מלח ופלפל"],
    instructions: "מגררים את הקישואים וסוחטים מהם את הנוזלים.\nמערבבים עם שאר המצרכים, יוצקים לתבנית ואופים 45 דקות ב־180 מעלות.",
    author: "rivka",
    saves: ["admin"],
  },
  {
    title: "עוגיות שיבולת שועל",
    category: "קינוחים",
    difficulty: "EASY",
    kosherType: "PAREVE",
    prepTimeMinutes: 35,
    servings: 30,
    ingredients: ["2 כוסות שיבולת שועל", "1 כוס קמח", "3/4 כוס סוכר חום", "1/2 כוס שמן", "1 ביצה", "1/2 כוס צימוקים"],
    instructions: "מערבבים את כל המצרכים בקערה.\nיוצרים כדורים קטנים על תבנית ומשטחים.\nאופים 12 דקות ב־180 מעלות.",
    author: "admin",
  },
  {
    title: "המתכון הסודי של סבתא",
    description: "מתכון פרטי: רק אני רואה אותו",
    category: "עוגות ומאפים",
    difficulty: "HARD",
    kosherType: "PAREVE",
    prepTimeMinutes: 120,
    ingredients: ["3 כוסות קמח", "1 כוס שמן", "1 כוס סוכר", "4 ביצים", "1 כוס מיץ תפוזים"],
    instructions: "המתכון המלא כתוב במחברת של סבתא. מערבבים ואופים שעה ב־170 מעלות.",
    visibility: "PRIVATE",
    author: "noa",
  },
  {
    title: "לחם מחמצת ביתי",
    description: "עם קישור לסרטון הדגמה, ממתין לאישור מנהל",
    category: "לחמים",
    difficulty: "HARD",
    kosherType: "PAREVE",
    prepTimeMinutes: 1440,
    servings: 1,
    ingredients: ["500 גרם קמח לחם", "350 מ\"ל מים", "100 גרם מחמצת פעילה", "10 גרם מלח"],
    instructions: "מערבבים קמח ומים ומחכים שעה.\nמוסיפים מחמצת ומלח, ומקפלים כל חצי שעה במשך שלוש שעות.\nמעצבים, מתפיחים לילה במקרר ואופים בסיר סגור.",
    videoUrl: "https://www.example.com/videos/sourdough-demo",
    status: "PENDING",
    author: "rivka",
  },
];

async function main() {
  console.log(`Seed (${env.NODE_ENV}), demo data: ${withDemo ? "yes" : "no"}`);

  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  const categories = new Map((await prisma.category.findMany()).map((c) => [c.name, c.id]));

  // ----- מנהל -----
  let admin;
  if (isProd) {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
      console.log("ADMIN_EMAIL או ADMIN_PASSWORD לא הוגדרו: לא נוצר חשבון מנהל.");
    } else {
      admin = await upsertUser(env.ADMIN_EMAIL.toLowerCase(), env.ADMIN_DISPLAY_NAME, env.ADMIN_PASSWORD, "ADMIN");
      console.log(`Admin account ready: ${admin.email}`);
    }
  } else {
    admin = await upsertUser(env.ADMIN_EMAIL?.toLowerCase() ?? "admin@example.com", env.ADMIN_DISPLAY_NAME, env.ADMIN_PASSWORD ?? "Admin12345", "ADMIN");
  }

  if (!withDemo) return;

  // ----- משתמשי דמו -----
  const demoPassword = (known: string) => (isProd ? randomBytes(24).toString("base64url") + "A1" : known);
  const noa = await upsertUser("user@example.com", "נועה", demoPassword("User12345"), "USER", { contactEmail: "noa.contact@example.com" });
  const rivka = await upsertUser("user2@example.com", "רבקה", demoPassword("User12345"), "USER", { contactPhone: "050-0000000" });
  const contentAdmin = admin ?? (await upsertUser("demo-admin@example.com", "צוות האתר", demoPassword("Admin12345"), "USER"));
  const people = { noa, rivka, admin: contentAdmin };

  if ((await prisma.recipe.count()) > 0) {
    console.log("כבר יש מתכונים במסד הנתונים: תוכן הדמו לא נוסף שוב.");
    return;
  }

  const recipeIds = new Map<string, number>();
  for (const r of RECIPES) {
    const created = await prisma.recipe.create({
      data: {
        title: r.title,
        description: r.description ?? null,
        categoryId: categories.get(r.category)!,
        difficulty: r.difficulty,
        kosherType: r.kosherType,
        prepTimeMinutes: r.prepTimeMinutes ?? null,
        servings: r.servings ?? null,
        instructions: r.instructions,
        videoUrl: r.videoUrl ?? null,
        visibility: r.visibility ?? "PUBLIC",
        status: r.status ?? "APPROVED",
        rejectionReason: r.rejectionReason ?? null,
        showContact: r.showContact ?? false,
        authorId: people[r.author].id,
        ingredients: { create: r.ingredients.map((text, position) => ({ text, position })) },
      },
    });
    recipeIds.set(r.title, created.id);
    for (const s of r.saves ?? []) {
      await prisma.savedRecipe.create({ data: { userId: people[s].id, recipeId: created.id } });
    }
  }

  // ----- פורום -----
  const q1 = await prisma.forumQuestion.create({
    data: {
      title: "למה עוגת השמרים שלי לא תופחת?",
      body: "הכנתי לפי המתכון, השארתי את הבצק שעתיים במקום חמים, והוא כמעט לא גדל.\nהשמרים היו מחבילה שנפתחה לפני חודש.",
      categoryId: categories.get("עוגות ומאפים")!,
      recipeId: recipeIds.get("עוגת שמרים שוקולד")!,
      isSolved: true,
      authorId: rivka.id,
    },
  });
  await prisma.forumAnswer.create({
    data: {
      questionId: q1.id,
      body: "כדאי לבדוק קודם שהשמרים פעילים: מערבבים אותם עם מעט מים פושרים וסוכר ומחכים עשר דקות. אם לא נוצר קצף, הם כבר לא טובים.",
      showContact: true,
      authorId: noa.id,
    },
  });

  const q2 = await prisma.forumQuestion.create({
    data: {
      title: "במה אפשר להחליף ביצים בעוגה פרווה?",
      body: "אחד הילדים לא אוכל ביצים. מחפשת תחליף שעובד בעוגות בחושות.",
      categoryId: categories.get("עוגות ומאפים")!,
      authorId: noa.id,
    },
  });
  await prisma.forumAnswer.create({
    data: {
      questionId: q2.id,
      body: "אני משתמשת בכף זרעי פשתן טחונים עם שלוש כפות מים במקום כל ביצה. עובד מצוין בעוגות פשוטות.",
      authorId: rivka.id,
    },
  });

  await prisma.forumQuestion.create({
    data: {
      title: "המרק יצא מלוח מדי, אפשר להציל?",
      body: "בישלתי סיר גדול של מרק ירקות, והמלח פשוט יותר מדי. מה עושים?",
      categoryId: categories.get("מרקים")!,
      authorId: noa.id,
    },
  });

  await prisma.forumQuestion.create({
    data: {
      title: "איך יודעים שהמחמצת מוכנה?",
      body: "מצרפת קישור לסרטון של המחמצת שלי. היא מבעבעת, אבל לא בטוחה אם מספיק.",
      categoryId: categories.get("לחמים")!,
      videoUrl: "https://www.example.com/videos/my-starter",
      status: "PENDING",
      authorId: rivka.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: rivka.id,
      type: "NEW_ANSWER",
      message: `התקבלה תשובה חדשה לשאלה שלך: "${q1.title}"`,
      entityType: "question",
      entityId: q1.id,
    },
  });
  await prisma.notification.create({
    data: {
      userId: noa.id,
      type: "NEW_ANSWER",
      message: `התקבלה תשובה חדשה לשאלה שלך: "${q2.title}"`,
      entityType: "question",
      entityId: q2.id,
    },
  });

  console.log(`Demo data: ${RECIPES.length} recipes, 4 questions, 2 answers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
