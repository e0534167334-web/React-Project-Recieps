# מתחילים כאן: העלאת השרת לאינטרנט

המדריך הזה מיועד למי שמעולם לא העלתה שרת לאינטרנט. עוברים עליו לפי הסדר, שלב אחרי שלב.

**מה נעשה:** נעלה את הקוד ל־**GitHub**, ניצור מסד נתונים חינמי ב־**Supabase**, ונפעיל את השרת ב־**Render**. בסוף יהיה לך שרת אמיתי באינטרנט, עם Swagger שאפשר להראות בהגשה.

בהגשה צריך שבענן יהיו **שלושת החלקים**: מסד הנתונים (Supabase), השרת (Render) ואתר ה־React (גם הוא ב־Render). חלקים א–ה עוסקים בשרת ובמסד הנתונים. **חלק ו** מסביר איך להעלות את אתר ה־React כשהוא מוכן, ו**חלק ז** הוא רשימת בדיקה לפני הגשה.

**כמה זמן:** בערך שעה בפעם הראשונה.

> **חשוב לדעת מראש:** אתרים משנים מדי פעם את העיצוב ואת שמות הכפתורים. כתבתי את השמות כפי שהם מוכרים לי, אבל לא יכולתי לבדוק את המסכים העדכניים בזמן הכתיבה. אם כפתור נקרא קצת אחרת, חפשי את האפשרות הדומה ביותר.

> **על המסלולים החינמיים:** למסלולים החינמיים יש מגבלות, והם עשויים להשתנות. ב־Render שרת חינמי "נרדם" אחרי כרבע שעה בלי שימוש, והפנייה הראשונה אחרי זה לוקחת בערך דקה. זה תקין. לפני הצגת הפרויקט, פתחי את `/api/health` דקה מראש כדי "להעיר" אותו.

---

## שלב 0: מה צריך להכין

- כתובת אימייל.
- הקובץ `backend-project.zip` שקיבלת.
- פנקס או קובץ טקסט במחשב לשמירת סיסמאות וכתובות. **לא** לשמור אותם בתוך תיקיית הפרויקט.

---

## חלק א: GitHub

### 1. פתיחת חשבון

1. נכנסים ל־https://github.com ולוחצים **Sign up**.
2. ממלאים אימייל, סיסמה ושם משתמש, ומאשרים את האימייל.

### 2. יצירת Repository (מאגר קוד)

1. אחרי ההתחברות לוחצים על **+** בפינה העליונה, ואז **New repository**.
2. **Repository name:** `recipe-sharing-backend`
3. בוחרים **Private** (פרטי) או **Public** (ציבורי). שניהם עובדים עם Render.
4. **לא** מסמנים "Add a README file", כי יש כבר README בפרויקט.
5. לוחצים **Create repository**.

### 3. חילוץ ה־ZIP

- **Windows:** לחיצה ימנית על הקובץ, **Extract All** (חלץ הכול), ואז **Extract**.
- **Mac:** לחיצה כפולה על הקובץ.

נוצרת תיקייה בשם `backend-project`. בתוכה יש את `src`, `prisma`, `package.json` ועוד.

**קבצים מוסתרים:** יש בפרויקט קבצים ששמם מתחיל בנקודה (`.gitignore`, `.env.example`). ב־Mac מציגים אותם בתיקייה עם המקשים `Cmd + Shift + .`. ב־Windows: בסייר הקבצים, **View** (תצוגה), ואז סימון **Hidden items** (פריטים מוסתרים).

### 4. העלאת הקבצים דרך הדפדפן

1. בעמוד ה־Repository החדש לוחצים על הקישור **uploading an existing file** (או **Add file**, ואז **Upload files**).
2. פותחים את התיקייה `backend-project` במחשב, מסמנים **את כל מה שבתוכה** (`Ctrl+A` או `Cmd+A`) וגוררים לחלון הדפדפן.
   - חשוב לגרור את **התוכן** של התיקייה, ולא את התיקייה עצמה. כך `package.json` יהיה בשורש ה־Repository.
   - עדיף להשתמש ב־Chrome או Edge, ששומרים על מבנה התיקיות בגרירה.
3. למטה, בתיבה **Commit changes**, לוחצים **Commit changes**.

### 5. בדיקה שהקבצים עלו

בעמוד הראשי של ה־Repository צריך לראות ישירות: `src`, `prisma`, `tests`, `docs`, `package.json`, `package-lock.json`, `render.yaml`, `README.md`.

- אם רואים רק תיקייה אחת בשם `backend-project`, גררת את התיקייה במקום את התוכן שלה. מוחקים ומעלים שוב.
- **אסור** שיופיע קובץ בשם `.env` (בלי `.example`). אם הוא שם, מוחקים אותו מיד.

---

## חלק ב: מסד נתונים ב־Supabase

### 1. פתיחת חשבון

1. נכנסים ל־https://supabase.com ולוחצים **Start your project**.
2. נרשמים. הכי פשוט: **Continue with GitHub**.

### 2. יצירת Database

1. לוחצים **New project**.
2. **Name:** `recipe-sharing`
3. **Database Password:** לוחצים **Generate a password**, ו**מעתיקים את הסיסמה לפנקס שלך**. אי אפשר לראות אותה שוב.
4. **Region:** אזור קרוב, למשל אחד מאזורי אירופה.
5. לוחצים **Create new project** ומחכים כמה דקות עד שהפרויקט מוכן.

### 3. קבלת כתובת החיבור (Connection String)

1. בראש עמוד הפרויקט לוחצים **Connect**.
2. בוחרים בחיבור מסוג **Session pooler** (פורט 5432).
   - למה דווקא הוא? החיבור הישיר (Direct) של Supabase עובד בכתובות IPv6, ושרתים רבים בענן, כולל Render, צריכים IPv4. ה־Session pooler עובד ב־IPv4, ומתאים גם ל־Migrations.
3. מעתיקים את הכתובת. היא נראית בערך כך:
   ```
   postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
4. מחליפים את `[YOUR-PASSWORD]` בסיסמה ששמרת בסעיף 2 (בלי הסוגריים המרובעים).

### 4. שמירה בטוחה

- שומרים את הכתובת המלאה בפנקס שלך. היא מכילה סיסמה, ולכן **לא** מעלים אותה ל־GitHub, לא שולחים בצ'אט ולא מצלמים מסך.
- אם הכתובת דלפה בטעות: בהגדרות מסד הנתונים ב־Supabase מאפסים את סיסמת מסד הנתונים, ומעדכנים את הכתובת ב־Render.

### 5. אחסון תמונות (כדי שהעלאת תמונות תעבוד)

זה רשות. בלעדיו כל האתר עובד, רק העלאת תמונות מחזירה שגיאה 503 עם הסבר.

1. בתפריט הצד של Supabase לוחצים **Storage**, ואז **New bucket**.
2. **Name:** `recipe-images`
3. מסמנים **Public bucket**, כדי שהתמונות יוצגו באתר.
4. לוחצים **Create** (או **Save**).
5. שומרים בפנקס שני ערכים מתוך **Project Settings**:
   - **Project URL**: נראית כמו `https://abcdefgh.supabase.co`. נמצאת בעמוד **Data API** או **API**.
   - **מפתח סודי** (`service_role`, או בממשק החדש **Secret key**): נמצא בעמוד **API Keys**.
   - המפתח הסודי נותן שליטה מלאה בפרויקט. שומרים אותו רק ב־Render, **אף פעם** לא בקוד ה־React ולא ב־GitHub.

### 6. החיבור בין השרת למסד הנתונים

את הכתובת מסעיף 3 נדביק ב־Render בשם `DATABASE_URL`, בחלק הבא. בעליית השרת הוא ייצור את הטבלאות לבד (Migrations), ויוסיף קטגוריות וחשבון מנהל.

---

## חלק ג: Render

### 1. פתיחת חשבון

1. נכנסים ל־https://render.com ולוחצים **Get Started**.
2. נרשמים עם **GitHub**. זו הדרך הפשוטה ביותר לחבר את הקוד.

### 2. חיבור GitHub

אם נרשמת עם GitHub, Render יבקש אישור גישה ל־Repositories. אפשר לבחור **Only select repositories** ולסמן רק את `recipe-sharing-backend`.

### 3–8. יצירת השרת בעזרת הקובץ render.yaml (מומלץ)

בפרויקט יש קובץ `render.yaml` שבו כבר מוגדרים כל ההגדרות. כך לא צריך להקליד Build ו־Start בעצמך.

1. בלוח הבקרה של Render לוחצים **New +**, ואז **Blueprint**.
2. בוחרים את ה־Repository `recipe-sharing-backend` ולוחצים **Connect**.
3. **Blueprint Name:** `recipe-sharing`
4. Render יקרא את `render.yaml` ויבקש למלא את הערכים החסרים:

| שם | מה לכתוב |
| --- | --- |
| `DATABASE_URL` | הכתובת מ־Supabase (חלק ב, סעיף 3), עם הסיסמה |
| `CORS_ORIGINS` | כתובת אתר ה־React שלך. עד שיש כתובת: `http://localhost:5173` |
| `ADMIN_EMAIL` | האימייל של חשבון המנהל, למשל שלך |
| `ADMIN_PASSWORD` | סיסמת מנהל חזקה, **10 תווים לפחות**. שמרי אותה בפנקס |
| `SUPABASE_URL` | ה־Project URL מחלק ב, סעיף 5. אפשר להשאיר ריק |
| `SUPABASE_SERVICE_ROLE_KEY` | המפתח הסודי מחלק ב, סעיף 5. אפשר להשאיר ריק |
| `AI_API_KEY` | ריק (העוזר יעבוד במצב בסיסי) |

את `JWT_SECRET` לא צריך למלא: Render יוצר מפתח אקראי לבד.

5. לוחצים **Apply** (או **Deploy Blueprint**).

**הפעלת Prisma Migrations:** לא צריך לעשות כלום. פקודת ההפעלה `npm run start:render` מריצה בכל עלייה את `prisma migrate deploy`, יוצרת את הקטגוריות ואת חשבון המנהל (בלי ליצור כפילויות), ורק אז מפעילה את השרת.

**תוכן לדוגמה:** כדי שבאתר יופיעו מתכונים ושאלות לדוגמה, משנים ב־**Environment** את `SEED_DEMO_DATA` ל־`true` ולוחצים **Save, rebuild, and deploy** (או **Save Changes**). התוכן נוסף פעם אחת בלבד, רק אם אין עדיין מתכונים. למשתמשי הדמו בענן יש סיסמה אקראית, כך שאי אפשר להתחבר אליהם. מתחברים עם חשבון המנהל, או נרשמים כמשתמשת חדשה.

### דרך חלופית: יצירה ידנית (אם Blueprint לא זמין)

1. **New +**, ואז **Web Service**, ובוחרים את ה־Repository.
2. ממלאים:

| שדה | ערך |
| --- | --- |
| Name | `recipe-sharing-api` |
| Language / Runtime | `Node` |
| Branch | `main` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start:render` |
| Instance Type | `Free` |

3. ב־**Environment Variables** לוחצים **Add Environment Variable** לכל אחד מהערכים בטבלה שלמעלה, ובנוסף:
   - `NODE_ENV` = `production`
   - `NODE_VERSION` = `22`
   - `JWT_SECRET` = מחרוזת אקראית של 40 תווים ומעלה. אם יש ליד השדה כפתור **Generate**, משתמשים בו.
4. ב־**Advanced**, בשדה **Health Check Path**: `/api/health`
5. לוחצים **Deploy Web Service**.

### 9. בדיקה שהשרת פעיל

1. בעמוד השירות ב־Render פותחים את לשונית **Logs**.
2. הבנייה הראשונה לוקחת כמה דקות. בסוף צריך לראות שורות כמו:
   - `All migrations have been successfully applied` (או הודעה שאין Migrations חדשות)
   - `Admin account ready: ...`
   - `השרת פועל בפורט ...`
3. בראש העמוד מופיעה כתובת השרת, בערך כך: `https://recipe-sharing-api.onrender.com`. זו כתובת ה־**Base URL** שלך. שמרי אותה.

---

## חלק ד: בדיקה שהכול עובד

בכל הסעיפים, `https://YOUR-APP.onrender.com` היא הכתובת מחלק ג, סעיף 9.

1. **בדיקת בריאות:** פותחים בדפדפן `https://YOUR-APP.onrender.com/api/health`. צריך לראות `"status":"ok"` ו־`"database":"ok"`.
2. **Swagger:** פותחים `https://YOUR-APP.onrender.com/api-docs`. מופיע עמוד עם כל נקודות הקצה.
3. **התחברות מתוך Swagger:** פותחים את **POST /api/auth/login**, לוחצים **Try it out**, מחליפים את הדוגמה ב־`ADMIN_EMAIL` וב־`ADMIN_PASSWORD` שלך, ולוחצים **Execute**.
4. **קבלת JWT:** בתשובה (Response body) מופיע `"token": "eyJ..."`. מעתיקים את הערך שבין המירכאות.
5. **Authorize:** לוחצים על הכפתור **Authorize** בראש העמוד, מדביקים את ה־Token (בלי המילה Bearer), לוחצים **Authorize** ואז **Close**.
6. **קריאה מוגנת:** פותחים את **GET /api/auth/me**, **Try it out**, **Execute**. צריך לחזור 200 עם הפרטים שלך.
   - לבדיקת 401: לוחצים שוב **Authorize**, ואז **Logout**, ומריצים שוב. חוזר 401.
   - לבדיקת 403: נרשמים כמשתמשת רגילה ב־**POST /api/auth/register**, מכניסים את ה־Token שלה ל־Authorize, ומריצים **GET /api/admin/pending**. חוזר 403.
7. **הוספת רשומה:** מכניסים שוב את ה־Token של המנהל ל־Authorize. מריצים **GET /api/categories** ובוחרים `id` של קטגוריה. ב־**POST /api/recipes**, **Try it out**, מחליפים את `categoryId` במספר שבחרת, ולוחצים **Execute**. חוזר 201 עם המתכון ו־`id` שלו.
8. **שליפה ממסד הנתונים:** ב־**GET /api/recipes/{id}** מכניסים את ה־`id` שקיבלת. המתכון חוזר מהשרת, כלומר הוא שמור במסד הנתונים. אפשר לראות אותו גם ב־Supabase: **Table Editor**, ואז הטבלה `recipes`.

---

## חלק ה: פתרון תקלות

| תקלה | מה רואים | מה עושים |
| --- | --- | --- |
| **Build Failed** | ב־Logs: `npm ERR!` או שגיאת TypeScript | בודקים ש־`package.json` ו־`package-lock.json` נמצאים בשורש ה־Repository ולא בתוך תיקייה. בודקים ש־Build Command הוא בדיוק `npm ci --include=dev && npm run build` |
| **DATABASE_URL שגוי** | ב־Logs: `DATABASE_URL חייב להתחיל ב־postgresql://`, או `P1001: Can't reach database server` | מעתיקים מחדש את כתובת ה־**Session pooler** מ־Supabase. בודקים שהסיסמה הוחלפה ושאין סוגריים מרובעים או רווחים |
| **סיסמת מסד נתונים שגויה** | `password authentication failed` | מאפסים את סיסמת מסד הנתונים ב־Supabase ומעדכנים את `DATABASE_URL` ב־Render. אם בסיסמה יש תווים כמו `@` או `#`, עדיף לאפס לסיסמה של אותיות וספרות בלבד |
| **בעיית Prisma** | `P3009` או `migrate found failed migrations` | המשמעות: Migration קודמת נעצרה באמצע. ב־Supabase, ב־**SQL Editor**, אפשר למחוק את כל הטבלאות ולהעלות שוב, בתנאי שאין עדיין מידע חשוב. אחר כך **Manual Deploy**, ואז **Deploy latest commit** |
| **JWT_SECRET חסר** | `JWT_SECRET חייב להכיל לפחות 32 תווים` | ב־**Environment** מוסיפים `JWT_SECRET` עם מחרוזת אקראית ארוכה, ושומרים |
| **ADMIN_PASSWORD קצר** | `ADMIN_PASSWORD` בשגיאת הגדרות | סיסמת מנהל של 10 תווים לפחות |
| **שגיאת CORS** | בדפדפן, בקונסול של אתר ה־React: `blocked by CORS policy` | ב־`CORS_ORIGINS` כותבים את כתובת אתר ה־React בדיוק, בלי `/` בסוף, למשל `https://my-recipes.netlify.app`. כמה כתובות: מפרידים בפסיק |
| **401** | `UNAUTHORIZED` | לא נשלח Token, או שפג תוקפו (אחרי 24 שעות). מתחברים מחדש ולוחצים שוב **Authorize** |
| **403** | `FORBIDDEN` | מחוברת, אבל אין הרשאה: פעולת מנהל עם משתמשת רגילה, או עריכה של תוכן של מישהו אחר |
| **Swagger לא נפתח** | עמוד ריק או שגיאה | בודקים שהכתובת היא `/api-docs` ושהשרת פעיל (`/api/health`). אם השרת "ישן", מחכים דקה ומרעננים |
| **השרת לא עולה** | ב־Logs השירות מתחיל ונופל שוב ושוב | קוראים את ה־Logs מלמטה למעלה. ברוב המקרים מופיעה ההודעה `שגיאה בהגדרות השרת`, עם שם המשתנה החסר |
| **העלאת תמונה מחזירה 503** | `אחסון התמונות לא הוגדר בשרת` | מגדירים `SUPABASE_URL` ו־`SUPABASE_SERVICE_ROLE_KEY` (חלק ב, סעיף 5) |
| **תמונה עלתה אבל לא מוצגת** | הקישור לתמונה מחזיר שגיאה | ב־Supabase Storage, ה־Bucket `recipe-images` חייב להיות **Public** |
| **הפנייה הראשונה איטית מאוד** | בערך דקה עד תשובה | השרת החינמי "התעורר" משינה. זה תקין |
| **רענון באתר ה־React מחזיר Not Found** | עמוד פנימי עובד בניווט, אבל לא ברענון | חסר כלל Rewrite (חלק ו, סעיף 4) |
| **אתר ה־React פונה ל־localhost** | בלשונית Network הבקשות הולכות ל־`localhost` | `VITE_API_URL` לא הוגדר ב־Render, או שלא בנית מחדש אחרי שהגדרת אותו |

### אם Render לא מתאים

אם המסלול החינמי של Render לא זמין לך, הפרויקט יעבוד בכל שירות שמריץ Node.js ומגדיר משתני סביבה (למשל Railway, Koyeb או Fly.io, לפי מה שמוצע בחינם באותו זמן). ההגדרות זהות:

- **Build:** `npm ci --include=dev && npm run build`
- **Start:** `npm run start:render`
- **משתני סביבה:** אותם ערכים כמו בטבלה של חלק ג
- **Health check:** `/api/health`

גם את מסד הנתונים אפשר להחליף בכל PostgreSQL אחר (למשל Neon): רק מחליפים את `DATABASE_URL`. ל־Render יש גם PostgreSQL חינמי, אבל לפי התיעוד שלהם הוא פג אחרי 30 יום, ולכן Supabase מתאים יותר.

---

## חלק ו: העלאת אתר ה־React (Client)

את החלק הזה עושים כשאתר ה־React שלך מוכן ועובד במחשב מול השרת. אין כאן קוד React, רק הגדרות פריסה.

### 1. הכנה בפרויקט ה־React

- כתובת השרת צריכה להגיע ממשתנה סביבה, ולא להיות כתובה בתוך הקוד. בפרויקט Vite קוראים לו `VITE_API_URL`.
- במחשב, בקובץ `.env` של פרויקט ה־React: `VITE_API_URL=http://localhost:3000`
- מוסיפים גם קובץ `.env.example` עם אותו שם משתנה, בלי ערכים אמיתיים.
- מוודאים שב־`.gitignore` של ה־React מופיעים `node_modules`, `dist` ו־`.env`.
- מריצים `npm run build` במחשב ומוודאים שהוא מסתיים בלי שגיאות.

> **בצד ה־React אין סודות.** כל מה שנמצא ב־`VITE_...` גלוי לכל מי שפותח את האתר. לעולם לא שמים שם את `JWT_SECRET`, את כתובת מסד הנתונים, את סיסמת המנהל או את מפתח Supabase הסודי.

### 2. העלאה ל־GitHub

יוצרים Repository **נפרד** לאתר ה־React, למשל `recipe-sharing-client`, ומעלים אליו את קבצי הפרויקט בדיוק כמו בחלק א. **בלי** התיקיות `node_modules` ו־`dist`.

### 3. יצירת Static Site ב־Render

1. ב־Render לוחצים **New +**, ואז **Static Site**, ובוחרים את ה־Repository של ה־React.
2. ממלאים:

| שדה | ערך |
| --- | --- |
| Name | `recipe-sharing-client` |
| Branch | `main` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

3. ב־**Environment Variables** מוסיפים:
   - `VITE_API_URL` = כתובת השרת מחלק ג, סעיף 9. למשל `https://recipe-sharing-api.onrender.com`, **בלי** `/` בסוף ובלי `/api`, אלא אם כך בנית את קריאות ה־API.
4. לוחצים **Create Static Site**.

> משתני `VITE_...` נכנסים לאתר **בזמן ה־Build**. אם משנים אחד מהם ב־Render, צריך לבנות מחדש: **Manual Deploy**, ואז **Deploy latest commit**.

### 4. הגדרה שחובה בגלל React Router

אתר React הוא בעצם עמוד אחד. בלי ההגדרה הזו, רענון של עמוד כמו `/recipes/5`, או כניסה ישירה אליו, מחזיר **Not Found**.

1. בעמוד ה־Static Site ב־Render פותחים **Redirects/Rewrites**.
2. מוסיפים כלל:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | `Rewrite` |

3. שומרים.

### 5. חיבור השרת לאתר (CORS)

השרת מקבל בקשות רק מכתובות שמופיעות ב־`CORS_ORIGINS`.

1. מעתיקים את כתובת האתר מ־Render, למשל `https://recipe-sharing-client.onrender.com`.
2. בשירות **של השרת** (`recipe-sharing-api`), ב־**Environment**, מעדכנים את `CORS_ORIGINS`:
   ```
   https://recipe-sharing-client.onrender.com,http://localhost:5173
   ```
   כך האתר בענן וגם האתר במחשב יכולים לפנות לשרת. בלי `/` בסוף הכתובת.
3. שומרים. השרת יעלה מחדש עם ההגדרה החדשה.

### 6. בדיקה

1. פותחים את כתובת האתר ומתחברים.
2. מרעננים את הדף בעמוד פנימי. אם מופיע Not Found, חוזרים לסעיף 4.
3. בכלי המפתחים של הדפדפן (`F12`), בלשונית **Network**, בודקים שהבקשות הולכות לכתובת השרת בענן ולא ל־`localhost`.
4. אם בלשונית **Console** מופיע `blocked by CORS policy`, חוזרים לסעיף 5.

---

## חלק ז: רשימת בדיקה לפני הגשה

- [ ] יש קישור ל־GitHub של השרת, ובו אין `node_modules` ואין `.env`.
- [ ] יש קישור ל־GitHub של אתר ה־React, ובו אין `node_modules` ואין `.env`.
- [ ] מסד הנתונים פעיל ב־Supabase, ויש בו קטגוריות.
- [ ] `https://.../api/health` של השרת מחזיר `"status":"ok"`.
- [ ] `https://.../api-docs` נפתח, ואפשר להתחבר מתוכו.
- [ ] אתר ה־React בענן נפתח, ואפשר להתחבר אליו כמנהל וכמשתמשת רגילה.
- [ ] רענון דף פנימי באתר לא מחזיר Not Found.
- [ ] אפשר להוסיף מתכון מהאתר, והוא מופיע אחרי רענון.
- [ ] כמה דקות לפני ההצגה פתחת את `/api/health`, כדי שהשרת "יתעורר".
- [ ] קראת את `docs/SERVER-EXPLAINED.md`, כדי שתוכלי להסביר את השרת.
