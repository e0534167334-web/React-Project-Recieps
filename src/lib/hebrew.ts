/**
 * מקצר מילה לצורה שמתאימה גם ליחיד וגם לרבים, לצורך חיפוש "מכיל".
 * למשל "ביצים" ו"ביצה" הופכות שתיהן ל"ביצ", ו"קישואים" ל"קישוא".
 */
export function stemHebrew(word: string): string {
  let w = word.trim();
  if (w.length > 4 && (w.endsWith("ים") || w.endsWith("ות"))) w = w.slice(0, -2);
  else if (w.length > 3 && (w.endsWith("ה") || w.endsWith("ת"))) w = w.slice(0, -1);
  return w;
}
