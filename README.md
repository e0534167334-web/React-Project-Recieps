# שיתוף מתכונים – Backend

שרת API לפלטפורמת שיתוף מתכונים: מתכונים ציבוריים ופרטיים, ספר מתכונים אישי, פורום עזרה, אישור מנהל לתוכן עם תמונה או סרטון, התראות ועוזר אישי.

> **מתחילה מאפס ורוצה להעלות לאינטרנט?** פתחי את [START-HERE.md](START-HERE.md).
> **כותבת את צד ה־React?** פתחי את [FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md).
> **מתכוננת להסביר את השרת?** פתחי את [docs/SERVER-EXPLAINED.md](docs/SERVER-EXPLAINED.md).

## טכנולוגיות

| תחום | בחירה |
| --- | --- |
| שפה וסביבה | Node.js 22 ומעלה, TypeScript (strict) |
| שרת | Express 5 |
| מסד נתונים | PostgreSQL עם Prisma ORM 7 |
| ולידציה | Zod 4 (הודעות שגיאה בעברית) |
| התחברות | JWT (HS256) וסיסמאות עם bcrypt |
| תיעוד | Swagger UI ב־`/api-docs`, קובץ OpenAPI 3.1 ב־`docs/openapi.json` |
| בדיקות | Vitest ו־Supertest מול PostgreSQL אמיתי |
| תמונות | Supabase Storage (רשות) |

## הרצה במחשב

דרוש: Node.js 22 ומעלה, ומסד נתונים PostgreSQL (מקומי, או חינמי ב־Supabase).

```bash
npm install
cp .env.example .env          # ובו למלא DATABASE_URL ו־JWT_SECRET
npx prisma migrate deploy     # יוצר את הטבלאות
npm run db:seed               # קטגוריות, משתמשי דמו ותוכן דמו
npm run dev                   # השרת עולה ב־http://localhost:3000
```

אחר כך: `http://localhost:3000/api-docs` לתיעוד ו־`http://localhost:3000/api/health` לבדיקה.

### משתמשי הדמו (בפיתוח בלבד)

| תפקיד | אימייל | סיסמה |
| --- | --- | --- |
| מנהל | admin@example.com | Admin12345 |
| משתמשת רגילה (נועה) | user@example.com | User12345 |
| משתמשת רגילה (רבקה) | user2@example.com | User12345 |

בפרודקשן (`NODE_ENV=production`) החשבונות האלה **לא** נוצרים עם הסיסמאות האלה. המנהל נוצר מ־`ADMIN_EMAIL` ו־`ADMIN_PASSWORD`.

## פקודות

| פקודה | מה היא עושה |
| --- | --- |
| `npm run dev` | הרצה לפיתוח, עם רענון אוטומטי |
| `npm run build` | `prisma generate` וקומפילציה לתיקייה `dist` |
| `npm start` | הרצת הגרסה המקומפלת |
| `npm run start:render` | לענן: Migrations, Seed (בלי כפילויות) והפעלה |
| `npm run typecheck` | בדיקת TypeScript |
| `npm test` | כל הבדיקות האוטומטיות |
| `npm run db:migrate` | הפעלת Migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | יצירת Migration חדשה אחרי שינוי בסכמה |
| `npm run db:seed` | נתוני דמו (פיתוח) |
| `npm run db:seed:prod` | Seed מהגרסה המקומפלת |
| `npm run openapi:export` | ייצוא `docs/openapi.json` |

## בדיקות

הבדיקות רצות מול מסד נתונים **נפרד** ונמחקות בין בדיקה לבדיקה. שם המסד חייב להכיל את המילה `test`.

```bash
createdb recipes_test
DATABASE_URL=postgresql://postgres:password@localhost:5432/recipes_test npx prisma migrate deploy
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/recipes_test npm test
```

## מבנה התיקיות

```
src/
  config/env.ts          בדיקת משתני סביבה בעליית השרת
  db/prisma.ts           חיבור יחיד למסד הנתונים
  auth/                  JWT וסיסמאות
  middleware/            אימות, הרשאות, ולידציה, טיפול בשגיאות
  schemas/               סכמות Zod לכל בקשה
  routes/index.ts        כל נקודות הקצה
  controllers/           קריאת הבקשה והחזרת התשובה
  services/              הלוגיקה: הרשאות, נראות, אישור מנהל, התראות
  storage/               אחסון תמונות (Supabase, או זיכרון בבדיקות)
  lib/                   שגיאות, עמודים, המרה לתשובות API
  docs/openapi.ts        תיעוד Swagger
  app.ts / server.ts     הרכבת השרת והפעלתו
prisma/
  schema.prisma          8 טבלאות
  migrations/            Migrations של מסד הנתונים
  seed.ts                נתוני דמו
tests/                   80 בדיקות אוטומטיות
docs/openapi.json        קובץ OpenAPI
docs/SERVER-EXPLAINED.md הסבר השרת במילים פשוטות
```

## עקרונות אבטחה

- סיסמאות נשמרות כ־Hash של bcrypt. סיסמה, Hash ואימייל ההתחברות של אחרים לא מוחזרים בשום תשובה.
- המשתמש והתפקיד נקבעים לפי ה־Token ומסד הנתונים בלבד, לא לפי מזהה שנשלח מהדפדפן.
- תוכן פרטי, ממתין או נדחה של אחרים מחזיר 404, כדי לא לחשוף שהוא קיים.
- קבצים מזוהים לפי תוכנם (JPG, PNG, WEBP), ותמונה אפשר לצרף רק אם המשתמש עצמו העלה אותה.
- הגבלת ניסיונות על התחברות והרשמה, CORS לפי רשימת כתובות, ו־Helmet.

## הערה טכנית על ה־Migrations

ה־Migration הראשונה נוצרה ממנוע הסכמה הרשמי של Prisma (גרסת WebAssembly) מתוך `schema.prisma`, והשנייה מוסיפה אילוצי `CHECK`. בסביבת הפיתוח שבה נבנה הפרויקט לא הייתה גישה להורדת המנוע הרגיל של Prisma CLI, ולכן הפקודה `prisma migrate deploy` עצמה לא הורצה שם. ה־Migrations הוחלו על מסדי הבדיקה דרך אותו מנוע, והבדיקות רצו מולם. בענן, `prisma migrate deploy` מוריד את המנוע ופועל כרגיל.
