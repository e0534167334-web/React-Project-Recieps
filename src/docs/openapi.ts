// תיעוד OpenAPI 3 של כל ה־API. מוצג ב־/api-docs ומיוצא גם ל־docs/openapi.json
// (npm run openapi:export).

type Obj = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: Obj, example?: unknown) => ({
  content: { "application/json": { schema, ...(example !== undefined ? { example } : {}) } },
});
const body = (schema: Obj, example?: unknown) => ({ required: true, ...json(schema, example) });
const ok = (description: string, schema?: Obj, example?: unknown) =>
  schema ? { description, ...json(schema, example) } : { description };
const err = (name: "BadRequest" | "Unauthorized" | "Forbidden" | "NotFound" | "Conflict" | "TooMany") => ({
  $ref: `#/components/responses/${name}`,
});

const bearer = [{ bearerAuth: [] }];
const optionalBearer = [{}, { bearerAuth: [] }];

const idPath = (description = "מזהה") => ({
  name: "id",
  in: "path",
  required: true,
  description,
  schema: { type: "integer", minimum: 1 },
});
const q = (name: string, schema: Obj, description: string) => ({ name, in: "query", required: false, description, schema });
const pageParams = [
  q("page", { type: "integer", minimum: 1, default: 1 }, "מספר עמוד"),
  q("pageSize", { type: "integer", minimum: 1, maximum: 50, default: 12 }, "פריטים בעמוד"),
];

const author = { id: 2, displayName: "נועה", contactEmail: "noa.contact@example.com", contactPhone: null };
const category = { id: 1, name: "עוגות ומאפים" };
const recipeListExample = {
  id: 1,
  title: "עוגת שמרים שוקולד",
  description: "עוגה רכה לשבת",
  category,
  difficulty: "MEDIUM",
  kosherType: "DAIRY",
  prepTimeMinutes: 180,
  servings: 12,
  imageUrl: null,
  visibility: "PUBLIC",
  status: "APPROVED",
  author: { id: 2, displayName: "נועה" },
  saveCount: 3,
  isSaved: false,
  createdAt: "2026-10-20T10:00:00.000Z",
  updatedAt: "2026-10-20T10:00:00.000Z",
};
const recipeDetailExample = {
  ...recipeListExample,
  author,
  ingredients: ["1 ק\"ג קמח", "50 גרם שמרים", "1 כוס סוכר", "200 גרם שוקולד מריר"],
  instructions: "מערבבים את השמרים עם מים פושרים...\nלשים בצק רך ומשאירים לתפוח שעה.",
  videoUrl: null,
  showContact: true,
  permissions: { canEdit: false, canDelete: false },
};
const questionExample = {
  id: 1,
  title: "למה עוגת השמרים שלי לא תופחת?",
  body: "הבצק כמעט לא גדל אחרי שעתיים במקום חמים.",
  category,
  recipe: { id: 1, title: "עוגת שמרים שוקולד" },
  imageUrl: null,
  videoUrl: null,
  isSolved: false,
  status: "APPROVED",
  showContact: false,
  author: { id: 2, displayName: "נועה" },
  answerCount: 2,
  createdAt: "2026-10-25T08:00:00.000Z",
  updatedAt: "2026-10-25T08:00:00.000Z",
  permissions: { canEdit: false, canDelete: false, canMarkSolved: false },
};
const answerExample = {
  id: 5,
  questionId: 1,
  body: "כדאי לבדוק שהשמרים פעילים: מערבבים עם מים פושרים וסוכר ומחכים 10 דקות.",
  imageUrl: null,
  videoUrl: null,
  status: "APPROVED",
  showContact: false,
  author: { id: 3, displayName: "רבקה" },
  createdAt: "2026-10-25T09:00:00.000Z",
  updatedAt: "2026-10-25T09:00:00.000Z",
  permissions: { canEdit: true, canDelete: true },
};
const pageOf = (items: unknown[]) => ({ items, page: 1, pageSize: 12, total: items.length, totalPages: 1 });

const enumDifficulty = { type: "string", enum: ["EASY", "MEDIUM", "HARD"], description: "EASY קל, MEDIUM בינוני, HARD מאתגר" };
const enumKosher = { type: "string", enum: ["MEAT", "DAIRY", "PAREVE"], description: "MEAT בשרי, DAIRY חלבי, PAREVE פרווה" };
const enumVisibility = { type: "string", enum: ["PUBLIC", "PRIVATE"], description: "PUBLIC ציבורי, PRIVATE פרטי" };
const enumStatus = { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"], description: "סטטוס אישור מנהל" };
const nullableString = (extra: Obj = {}) => ({ type: ["string", "null"], ...extra });
const nullableInt = (extra: Obj = {}) => ({ type: ["integer", "null"], ...extra });
const dateTime = { type: "string", format: "date-time" };

const page = (itemRef: string) => ({
  type: "object",
  required: ["items", "page", "pageSize", "total", "totalPages"],
  properties: {
    items: { type: "array", items: ref(itemRef) },
    page: { type: "integer" },
    pageSize: { type: "integer" },
    total: { type: "integer", description: "סך כל התוצאות" },
    totalPages: { type: "integer" },
  },
});

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "שיתוף מתכונים – API",
    version: "1.0.0",
    description:
      "API לפלטפורמת שיתוף מתכונים: מתכונים, ספר מתכונים אישי, פורום עזרה, אישור מנהל והתראות.\n\n" +
      "**איך מתחברים מתוך Swagger:**\n" +
      "1. פותחים את `POST /api/auth/login`, לוחצים **Try it out** ואז **Execute**.\n" +
      "2. מעתיקים את הערך של `token` מהתשובה.\n" +
      "3. לוחצים על הכפתור **Authorize** למעלה, מדביקים את ה־Token (בלי המילה Bearer) ולוחצים **Authorize**.\n" +
      "4. עכשיו אפשר לקרוא לנקודות קצה מוגנות (המסומנות במנעול).\n\n" +
      "קריאה מוגנת בלי Token מחזירה **401**. קריאה של משתמש רגיל לפעולת מנהל מחזירה **403**.\n\n" +
      "כל השגיאות מוחזרות במבנה אחיד: `{ error: { code, message, details? } }`.",
  },
  servers: [{ url: "/", description: "השרת הנוכחי" }],
  tags: [
    { name: "מערכת" },
    { name: "התחברות ופרופיל" },
    { name: "קטגוריות" },
    { name: "תמונות" },
    { name: "מתכונים" },
    { name: "הספר שלי" },
    { name: "פורום" },
    { name: "התראות" },
    { name: "ניהול" },
    { name: "עוזר אישי" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "ה־Token שמתקבל מ־login או register" },
    },
    responses: {
      BadRequest: {
        description: "נתונים לא תקינים",
        ...json(ref("Error"), {
          error: { code: "VALIDATION_ERROR", message: "נתונים לא תקינים", details: [{ field: "title", message: "שם המתכון חייב להכיל 2 תווים לפחות" }] },
        }),
      },
      Unauthorized: {
        description: "אין Token, ה־Token לא תקין או שפג תוקפו",
        ...json(ref("Error"), { error: { code: "UNAUTHORIZED", message: "ה־Token חסר או בפורמט שגוי. יש לשלוח Authorization: Bearer <token>" } }),
      },
      Forbidden: {
        description: "מחובר, אבל אין הרשאה לפעולה",
        ...json(ref("Error"), { error: { code: "FORBIDDEN", message: "פעולה זו מותרת למנהל בלבד" } }),
      },
      NotFound: {
        description: "לא נמצא, או שאינו גלוי למבקש",
        ...json(ref("Error"), { error: { code: "NOT_FOUND", message: "המתכון לא נמצא" } }),
      },
      Conflict: {
        description: "התנגשות עם נתונים קיימים",
        ...json(ref("Error"), { error: { code: "CONFLICT", message: "כתובת האימייל כבר רשומה במערכת" } }),
      },
      TooMany: {
        description: "יותר מדי ניסיונות בזמן קצר",
        ...json(ref("Error"), { error: { code: "TOO_MANY_REQUESTS", message: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות" } }),
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {
                type: "array",
                items: { type: "object", properties: { field: { type: "string" }, message: { type: "string" } } },
              },
            },
          },
        },
      },
      Health: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          database: { type: "string", enum: ["ok", "error"] },
          time: dateTime,
        },
      },
      User: {
        type: "object",
        description: "המשתמש המחובר עצמו (כולל אימייל ההתחברות)",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          contactEmail: nullableString({ format: "email" }),
          contactPhone: nullableString(),
          createdAt: dateTime,
        },
      },
      AuthResponse: {
        type: "object",
        properties: { token: { type: "string", description: "JWT לשליחה בכותרת Authorization" }, user: ref("User") },
      },
      RegisterRequest: {
        type: "object",
        required: ["displayName", "email", "password"],
        properties: {
          displayName: { type: "string", minLength: 2, maxLength: 40 },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, maxLength: 72, description: "לפחות 8 תווים, אות אחת וספרה אחת" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
      },
      ProfileUpdate: {
        type: "object",
        description: "שולחים רק שדות לעדכון. null או מחרוזת ריקה מוחקים פרט קשר",
        properties: {
          displayName: { type: "string", minLength: 2, maxLength: 40 },
          contactEmail: nullableString({ format: "email" }),
          contactPhone: nullableString({ description: "ספרות, רווחים, - ו־+ (7–20 תווים)" }),
        },
      },
      Author: {
        type: "object",
        description: "כותב התוכן. contactEmail ו־contactPhone מופיעים רק אם בתוכן סומן showContact",
        properties: {
          id: { type: "integer" },
          displayName: { type: "string" },
          contactEmail: nullableString(),
          contactPhone: nullableString(),
        },
      },
      Category: {
        type: "object",
        properties: { id: { type: "integer" }, name: { type: "string" }, recipeCount: { type: "integer", description: "מתכונים ציבוריים מאושרים" } },
      },
      CategoryRequest: { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 2, maxLength: 40 } } },
      RecipeListItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: nullableString(),
          category: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" } } },
          difficulty: enumDifficulty,
          kosherType: enumKosher,
          prepTimeMinutes: nullableInt(),
          servings: nullableInt(),
          imageUrl: nullableString({ description: "כתובת התמונה להצגה" }),
          visibility: enumVisibility,
          status: enumStatus,
          rejectionReason: nullableString({ description: "רק לכותב ולמנהל" }),
          author: ref("Author"),
          saveCount: { type: "integer", description: "כמה פעמים נשמר לספרים אישיים" },
          isSaved: { type: "boolean", description: "האם המשתמש המחובר שמר אותו" },
          createdAt: dateTime,
          updatedAt: dateTime,
        },
      },
      RecipeDetail: {
        allOf: [
          ref("RecipeListItem"),
          {
            type: "object",
            properties: {
              ingredients: { type: "array", items: { type: "string" }, description: "רכיב בכל פריט, לפי הסדר" },
              instructions: { type: "string", description: "ירידות שורה נשמרות" },
              imagePath: { type: "string", description: "רק לכותב: הערך לשליחה בעריכה" },
              videoUrl: nullableString(),
              showContact: { type: "boolean" },
              permissions: {
                type: "object",
                properties: { canEdit: { type: "boolean" }, canDelete: { type: "boolean" } },
              },
            },
          },
        ],
      },
      RecipeResponse: { type: "object", properties: { recipe: ref("RecipeDetail") } },
      RecipeCreate: {
        type: "object",
        required: ["title", "categoryId", "difficulty", "kosherType", "ingredients", "instructions"],
        properties: {
          title: { type: "string", minLength: 2, maxLength: 100 },
          description: nullableString({ maxLength: 500 }),
          categoryId: { type: "integer" },
          difficulty: enumDifficulty,
          kosherType: enumKosher,
          prepTimeMinutes: nullableInt({ minimum: 1, maximum: 1440 }),
          servings: nullableInt({ minimum: 1, maximum: 100 }),
          ingredients: {
            description: "טקסט עם שורה לכל רכיב (מומלץ), או מערך מחרוזות. 1–100 רכיבים, עד 200 תווים לרכיב",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
          },
          instructions: { type: "string", minLength: 10, maxLength: 10000 },
          imagePath: nullableString({ description: "הערך imagePath שהתקבל מ־POST /api/uploads/image" }),
          videoUrl: nullableString({ format: "uri", description: "קישור https לסרטון" }),
          visibility: { ...enumVisibility, default: "PUBLIC" },
          showContact: { type: "boolean", default: false, description: "הצגת פרטי הקשר מהפרופיל ליד המתכון" },
        },
      },
      RecipeUpdate: {
        type: "object",
        description: "כמו RecipeCreate, אבל כל השדות רשות. שולחים רק מה שמשתנה. null מוחק שדה רשות",
        properties: {
          title: { type: "string" },
          description: nullableString(),
          categoryId: { type: "integer" },
          difficulty: enumDifficulty,
          kosherType: enumKosher,
          prepTimeMinutes: nullableInt(),
          servings: nullableInt(),
          ingredients: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
          instructions: { type: "string" },
          imagePath: nullableString(),
          videoUrl: nullableString(),
          visibility: enumVisibility,
          showContact: { type: "boolean" },
        },
      },
      RecipePage: page("RecipeListItem"),
      CookbookItem: {
        allOf: [ref("RecipeListItem"), { type: "object", properties: { savedAt: dateTime } }],
      },
      CookbookPage: page("CookbookItem"),
      SaveResult: { type: "object", properties: { saved: { type: "boolean" }, recipeId: { type: "integer" } } },
      UploadResult: {
        type: "object",
        properties: {
          imagePath: { type: "string", description: "לשליחה בשדה imagePath של מתכון, שאלה או תשובה" },
          imageUrl: { type: "string", description: "לתצוגה מקדימה בטופס" },
        },
      },
      Question: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          body: { type: "string" },
          category: { type: ["object", "null"], properties: { id: { type: "integer" }, name: { type: "string" } } },
          recipe: { type: ["object", "null"], properties: { id: { type: "integer" }, title: { type: "string" } } },
          imageUrl: nullableString(),
          imagePath: { type: "string", description: "רק לכותב" },
          videoUrl: nullableString(),
          isSolved: { type: "boolean" },
          status: enumStatus,
          rejectionReason: nullableString({ description: "רק לכותב ולמנהל" }),
          showContact: { type: "boolean" },
          author: ref("Author"),
          answerCount: { type: "integer", description: "תשובות מאושרות" },
          createdAt: dateTime,
          updatedAt: dateTime,
          permissions: {
            type: "object",
            properties: { canEdit: { type: "boolean" }, canDelete: { type: "boolean" }, canMarkSolved: { type: "boolean" } },
          },
        },
      },
      QuestionResponse: { type: "object", properties: { question: ref("Question") } },
      QuestionPage: page("Question"),
      QuestionCreate: {
        type: "object",
        required: ["title", "body"],
        properties: {
          title: { type: "string", minLength: 5, maxLength: 150 },
          body: { type: "string", minLength: 10, maxLength: 5000 },
          categoryId: nullableInt(),
          recipeId: nullableInt({ description: "מתכון קשור מהאתר" }),
          imagePath: nullableString(),
          videoUrl: nullableString(),
          showContact: { type: "boolean", default: false },
        },
      },
      QuestionUpdate: {
        type: "object",
        description: "כל השדות רשות",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          categoryId: nullableInt(),
          recipeId: nullableInt(),
          imagePath: nullableString(),
          videoUrl: nullableString(),
          showContact: { type: "boolean" },
        },
      },
      SolvedRequest: { type: "object", required: ["isSolved"], properties: { isSolved: { type: "boolean" } } },
      Answer: {
        type: "object",
        properties: {
          id: { type: "integer" },
          questionId: { type: "integer" },
          body: { type: "string" },
          imageUrl: nullableString(),
          imagePath: { type: "string", description: "רק לכותב" },
          videoUrl: nullableString(),
          status: enumStatus,
          rejectionReason: nullableString(),
          showContact: { type: "boolean" },
          author: ref("Author"),
          createdAt: dateTime,
          updatedAt: dateTime,
          permissions: { type: "object", properties: { canEdit: { type: "boolean" }, canDelete: { type: "boolean" } } },
        },
      },
      AnswerResponse: { type: "object", properties: { answer: ref("Answer") } },
      AnswerCreate: {
        type: "object",
        required: ["body"],
        properties: {
          body: { type: "string", minLength: 2, maxLength: 5000 },
          imagePath: nullableString(),
          videoUrl: nullableString(),
          showContact: { type: "boolean", default: false },
        },
      },
      AnswerUpdate: {
        type: "object",
        description: "כל השדות רשות",
        properties: { body: { type: "string" }, imagePath: nullableString(), videoUrl: nullableString(), showContact: { type: "boolean" } },
      },
      ForumStats: { type: "object", properties: { unansweredCount: { type: "integer", description: "שאלות שממתינות לתשובה" } } },
      Notification: {
        type: "object",
        properties: {
          id: { type: "integer" },
          type: { type: "string", enum: ["NEW_ANSWER", "CONTENT_APPROVED", "CONTENT_REJECTED"] },
          message: { type: "string" },
          entityType: { type: "string", enum: ["recipe", "question"], description: "לאן להוביל בלחיצה" },
          entityId: { type: "integer" },
          isRead: { type: "boolean" },
          createdAt: dateTime,
        },
      },
      NotificationPage: {
        allOf: [page("Notification"), { type: "object", properties: { unreadCount: { type: "integer" } } }],
      },
      PendingQueue: {
        type: "object",
        properties: {
          recipes: { type: "array", items: { type: "object" } },
          questions: { type: "array", items: { type: "object" } },
          answers: { type: "array", items: { type: "object" } },
          total: { type: "integer" },
        },
      },
      ModerationRequest: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: { type: "string", enum: ["APPROVED", "REJECTED"] },
          reason: { type: "string", maxLength: 300, description: "סיבת דחייה (רשות)" },
        },
      },
      ModerationResult: {
        type: "object",
        properties: { type: { type: "string" }, id: { type: "integer" }, status: enumStatus, rejectionReason: nullableString() },
      },
      AssistantRequest: { type: "object", required: ["message"], properties: { message: { type: "string", minLength: 2, maxLength: 500 } } },
      AssistantResponse: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["basic", "ai"] },
          reply: { type: "string" },
          detectedIngredients: { type: "array", items: { type: "string" } },
          recipes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                imageUrl: nullableString(),
                prepTimeMinutes: nullableInt(),
                difficulty: enumDifficulty,
                kosherType: enumKosher,
                matchedIngredients: { type: "array", items: { type: "string" } },
                matchCount: { type: "integer" },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["מערכת"],
        summary: "בדיקת בריאות השרת ומסד הנתונים",
        responses: {
          200: ok("השרת ומסד הנתונים תקינים", ref("Health"), { status: "ok", database: "ok", time: "2026-10-26T20:00:00.000Z" }),
          503: ok("אין חיבור למסד הנתונים", ref("Health")),
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["התחברות ופרופיל"],
        summary: "הרשמה (משתמש רגיל)",
        description: "יוצר משתמש רגיל ומחזיר Token. אי אפשר להירשם כמנהל.",
        requestBody: body(ref("RegisterRequest"), { displayName: "שירה", email: "shira@example.com", password: "Recipe2026" }),
        responses: { 201: ok("נרשמה בהצלחה", ref("AuthResponse")), 400: err("BadRequest"), 409: err("Conflict"), 429: err("TooMany") },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["התחברות ופרופיל"],
        summary: "התחברות",
        requestBody: body(ref("LoginRequest"), { email: "user@example.com", password: "User12345" }),
        responses: {
          200: ok("התחברות הצליחה", ref("AuthResponse"), {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            user: { id: 2, email: "user@example.com", displayName: "נועה", role: "USER", contactEmail: null, contactPhone: null, createdAt: "2026-10-20T10:00:00.000Z" },
          }),
          400: err("BadRequest"),
          401: { description: "אימייל או סיסמה שגויים", ...json(ref("Error"), { error: { code: "UNAUTHORIZED", message: "אימייל או סיסמה שגויים" } }) },
          429: err("TooMany"),
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["התחברות ופרופיל"],
        summary: "המשתמש המחובר",
        security: bearer,
        responses: { 200: ok("פרטי המשתמש", { type: "object", properties: { user: ref("User") } }), 401: err("Unauthorized") },
      },
    },
    "/api/users/me": {
      patch: {
        tags: ["התחברות ופרופיל"],
        summary: "עדכון פרופיל ופרטי קשר",
        security: bearer,
        requestBody: body(ref("ProfileUpdate"), { contactEmail: "noa.contact@example.com", contactPhone: "050-0000000" }),
        responses: { 200: ok("עודכן", { type: "object", properties: { user: ref("User") } }), 400: err("BadRequest"), 401: err("Unauthorized") },
      },
    },
    "/api/categories": {
      get: {
        tags: ["קטגוריות"],
        summary: "כל הקטגוריות",
        responses: { 200: ok("רשימת קטגוריות", { type: "array", items: ref("Category") }, [{ ...category, recipeCount: 4 }]) },
      },
      post: {
        tags: ["קטגוריות"],
        summary: "הוספת קטגוריה (מנהל)",
        security: bearer,
        requestBody: body(ref("CategoryRequest"), { name: "סלטים" }),
        responses: {
          201: ok("נוצרה", { type: "object", properties: { category: ref("Category") } }),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          403: err("Forbidden"),
          409: err("Conflict"),
        },
      },
    },
    "/api/categories/{id}": {
      patch: {
        tags: ["קטגוריות"],
        summary: "שינוי שם קטגוריה (מנהל)",
        security: bearer,
        parameters: [idPath("מזהה הקטגוריה")],
        requestBody: body(ref("CategoryRequest"), { name: "עוגות ועוגיות" }),
        responses: {
          200: ok("עודכנה", { type: "object", properties: { category: ref("Category") } }),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          403: err("Forbidden"),
          404: err("NotFound"),
          409: err("Conflict"),
        },
      },
      delete: {
        tags: ["קטגוריות"],
        summary: "מחיקת קטגוריה (מנהל, רק אם אין בה מתכונים)",
        security: bearer,
        parameters: [idPath("מזהה הקטגוריה")],
        responses: { 204: ok("נמחקה"), 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("NotFound"), 409: err("Conflict") },
      },
    },
    "/api/uploads/image": {
      post: {
        tags: ["תמונות"],
        summary: "העלאת תמונה",
        description:
          "מעלים תמונה לפני שמירת מתכון, שאלה או תשובה, ושולחים את imagePath שהתקבל. JPG, PNG או WEBP, עד 5MB.\n\nתוכן ציבורי עם תמונה ממתין לאישור מנהל.",
        security: bearer,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", required: ["image"], properties: { image: { type: "string", format: "binary" } } },
            },
          },
        },
        responses: {
          201: ok("הועלתה", ref("UploadResult"), { imagePath: "uploads/2/6f1c...e2.webp", imageUrl: "https://.../uploads/2/6f1c...e2.webp" }),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          413: ok("הקובץ גדול מדי", ref("Error")),
          415: ok("סוג קובץ לא נתמך", ref("Error")),
          503: ok("אחסון התמונות לא הוגדר בשרת", ref("Error")),
        },
      },
    },
    "/api/recipes": {
      get: {
        tags: ["מתכונים"],
        summary: "רשימת מתכונים, עם חיפוש, סינון ומיון",
        description:
          "ברירת המחדל (scope=public): מתכונים ציבוריים מאושרים, פתוח לכולם. עם Token מוחזר גם isSaved לכל מתכון.\n\n" +
          "scope=visible (מחובר): כל מה שהמשתמש רשאי לראות: המתכונים שלו בכל סטטוס, והציבוריים. למנהל: הכול.\n\n" +
          "scope=all (מנהל בלבד): כל המתכונים במערכת. משתמש רגיל מקבל 403.\n\n" +
          "עם scope=visible או scope=all אפשר לסנן גם לפי status ו־visibility.",
        security: optionalBearer,
        parameters: [
          q("search", { type: "string" }, "חיפוש בשם ובתיאור"),
          q("categoryId", { type: "integer" }, "סינון לפי קטגוריה"),
          q("difficulty", enumDifficulty, "סינון לפי רמת קושי"),
          q("kosherType", enumKosher, "סינון לפי סוג"),
          q("maxPrepTime", { type: "integer", minimum: 1, maximum: 1440 }, "זמן הכנה מקסימלי בדקות"),
          q("ingredients", { type: "string", example: "ביצ,קישוא" }, "מצרכים מופרדים בפסיק. מוחזרים מתכונים שמכילים את כולם"),
          q("sort", { type: "string", enum: ["newest", "prepTime", "mostSaved"], default: "newest" }, "מיון"),
          q("scope", { type: "string", enum: ["public", "visible", "all"], default: "public" }, "אילו מתכונים: public ציבוריים, visible שלי וציבוריים, all הכול (מנהל)"),
          q("status", enumStatus, "סטטוס אישור (רק עם scope=visible או all)"),
          q("visibility", enumVisibility, "נראות (רק עם scope=visible או all)"),
          ...pageParams,
        ],
        responses: {
          200: ok("עמוד תוצאות", ref("RecipePage"), pageOf([recipeListExample])),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          403: err("Forbidden"),
        },
      },
      post: {
        tags: ["מתכונים"],
        summary: "הוספת מתכון",
        description: "מתכון ציבורי עם תמונה או סרטון נשמר בסטטוס PENDING עד אישור מנהל. אחרת מתפרסם מיד (APPROVED).",
        security: bearer,
        requestBody: body(ref("RecipeCreate"), {
          title: "שקשוקה ירוקה",
          description: "ארוחת בוקר מהירה",
          categoryId: 2,
          difficulty: "EASY",
          kosherType: "DAIRY",
          prepTimeMinutes: 25,
          servings: 4,
          ingredients: "6 ביצים\n2 קישואים\nחופן תרד\n100 גרם פטה",
          instructions: "מטגנים את הקישואים והתרד, שוברים מעל את הביצים ומפזרים פטה.",
          visibility: "PUBLIC",
          showContact: false,
        }),
        responses: { 201: ok("נוצר", ref("RecipeResponse")), 400: err("BadRequest"), 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("NotFound") },
      },
    },
    "/api/recipes/mine": {
      get: {
        tags: ["מתכונים"],
        summary: "המתכונים שלי (כולל פרטיים, ממתינים ונדחים)",
        security: bearer,
        parameters: [
          q("status", enumStatus, "סינון לפי סטטוס אישור"),
          q("visibility", enumVisibility, "סינון לפי נראות"),
          q("search", { type: "string" }, "חיפוש"),
          ...pageParams,
        ],
        responses: { 200: ok("עמוד תוצאות", ref("RecipePage")), 401: err("Unauthorized") },
      },
    },
    "/api/recipes/{id}": {
      get: {
        tags: ["מתכונים"],
        summary: "מתכון מלא",
        description: "מתכון פרטי, ממתין או נדחה גלוי רק לכותב ולמנהל. לאחרים מוחזר 404.",
        security: optionalBearer,
        parameters: [idPath("מזהה המתכון")],
        responses: { 200: ok("המתכון", ref("RecipeResponse"), { recipe: recipeDetailExample }), 401: err("Unauthorized"), 404: err("NotFound") },
      },
      patch: {
        tags: ["מתכונים"],
        summary: "עריכת מתכון (רק הכותב)",
        description: "כל עריכה של מתכון ציבורי עם תמונה או סרטון מחזירה אותו ל־PENDING.",
        security: bearer,
        parameters: [idPath("מזהה המתכון")],
        requestBody: body(ref("RecipeUpdate"), { prepTimeMinutes: 30, ingredients: "6 ביצים\n2 קישואים\n100 גרם פטה" }),
        responses: {
          200: ok("עודכן", ref("RecipeResponse")),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          403: err("Forbidden"),
          404: err("NotFound"),
        },
      },
      delete: {
        tags: ["מתכונים"],
        summary: "מחיקת מתכון (הכותב או מנהל)",
        security: bearer,
        parameters: [idPath("מזהה המתכון")],
        responses: { 204: ok("נמחק"), 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("NotFound") },
      },
    },
    "/api/cookbook": {
      get: {
        tags: ["הספר שלי"],
        summary: "המתכונים ששמרתי",
        security: bearer,
        parameters: [q("search", { type: "string" }, "חיפוש לפי שם"), ...pageParams],
        responses: { 200: ok("עמוד תוצאות", ref("CookbookPage")), 401: err("Unauthorized") },
      },
    },
    "/api/cookbook/{recipeId}": {
      post: {
        tags: ["הספר שלי"],
        summary: "שמירת מתכון לספר",
        security: bearer,
        parameters: [{ ...idPath("מזהה המתכון"), name: "recipeId" }],
        responses: {
          201: ok("נשמר", ref("SaveResult"), { saved: true, recipeId: 1 }),
          200: ok("כבר היה שמור", ref("SaveResult")),
          401: err("Unauthorized"),
          404: err("NotFound"),
        },
      },
      delete: {
        tags: ["הספר שלי"],
        summary: "הסרת מתכון מהספר",
        security: bearer,
        parameters: [{ ...idPath("מזהה המתכון"), name: "recipeId" }],
        responses: { 204: ok("הוסר"), 401: err("Unauthorized"), 404: err("NotFound") },
      },
    },
    "/api/forum/questions": {
      get: {
        tags: ["פורום"],
        summary: "רשימת שאלות",
        description:
          "ברירת המחדל (scope=visible): שאלות מאושרות, ועם Token גם השאלות שלי בכל סטטוס.\n\n" +
          "scope=all (מנהל בלבד): כל השאלות בכל סטטוס, ואפשר לסנן לפי status. משתמש רגיל מקבל 403.",
        security: optionalBearer,
        parameters: [
          q("search", { type: "string" }, "חיפוש בכותרת ובתוכן"),
          q("categoryId", { type: "integer" }, "סינון לפי קטגוריה"),
          q("solved", { type: "string", enum: ["true", "false"] }, "true = נפתרו, false = פתוחות"),
          q("unanswered", { type: "string", enum: ["true", "false"] }, "true = רק שאלות שממתינות לתשובה"),
          q("scope", { type: "string", enum: ["visible", "all"], default: "visible" }, "all = כל השאלות (מנהל בלבד)"),
          q("status", enumStatus, "סטטוס אישור (רק עם scope=all)"),
          q("sort", { type: "string", enum: ["newest", "oldest"], default: "newest" }, "מיון"),
          ...pageParams,
        ],
        responses: { 200: ok("עמוד תוצאות", ref("QuestionPage"), pageOf([questionExample])), 400: err("BadRequest"), 401: err("Unauthorized"), 403: err("Forbidden") },
      },
      post: {
        tags: ["פורום"],
        summary: "שאלה חדשה",
        description: "שאלה עם תמונה או סרטון ממתינה לאישור מנהל.",
        security: bearer,
        requestBody: body(ref("QuestionCreate"), {
          title: "במה אפשר להחליף ביצים בעוגה?",
          body: "מחפשת תחליף לביצים שעובד בעוגות בחושות.",
          categoryId: 1,
          showContact: false,
        }),
        responses: { 201: ok("נוצרה", ref("QuestionResponse")), 400: err("BadRequest"), 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("NotFound") },
      },
    },
    "/api/forum/stats": {
      get: {
        tags: ["פורום"],
        summary: "מספר השאלות שממתינות לתשובה (לסימון בתפריט)",
        responses: { 200: ok("מונה", ref("ForumStats"), { unansweredCount: 3 }) },
      },
    },
    "/api/forum/questions/{id}": {
      get: {
        tags: ["פורום"],
        summary: "שאלה מלאה",
        security: optionalBearer,
        parameters: [idPath("מזהה השאלה")],
        responses: { 200: ok("השאלה", ref("QuestionResponse"), { question: questionExample }), 401: err("Unauthorized"), 404: err("NotFound") },
      },
      patch: {
        tags: ["פורום"],
        summary: "עריכת שאלה (רק הכותבת)",
        security: bearer,
        parameters: [idPath("מזהה השאלה")],
        requestBody: body(ref("QuestionUpdate"), { body: "עדכון: השמרים היו מהחבילה שנפתחה לפני חודש." }),
        responses: {
          200: ok("עודכנה", ref("QuestionResponse")),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          403: err("Forbidden"),
          404: err("NotFound"),
        },
      },
      delete: {
        tags: ["פורום"],
        summary: "מחיקת שאלה וכל התשובות שלה (הכותבת או מנהל)",
        security: bearer,
        parameters: [idPath("מזהה השאלה")],
        responses: { 204: ok("נמחקה"), 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("NotFound") },
      },
    },
    "/api/forum/questions/{id}/solved": {
      patch: {
        tags: ["פורום"],
        summary: "סימון שאלה כנפתרה או פתוחה (רק הכותבת)",
        security: bearer,
        parameters: [idPath("מזהה השאלה")],
        requestBody: body(ref("SolvedRequest"), { isSolved: true }),
        responses: {
          200: ok("עודכן", ref("QuestionResponse")),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          403: err("Forbidden"),
          404: err("NotFound"),
        },
      },
    },
    "/api/forum/questions/{id}/answers": {
      get: {
        tags: ["פורום"],
        summary: "התשובות לשאלה (מהישנה לחדשה)",
        description: "תשובות מאושרות, ועם Token גם התשובות שלי שממתינות.",
        security: optionalBearer,
        parameters: [idPath("מזהה השאלה")],
        responses: { 200: ok("רשימת תשובות", { type: "array", items: ref("Answer") }, [answerExample]), 401: err("Unauthorized"), 404: err("NotFound") },
      },
      post: {
        tags: ["פורום"],
        summary: "תשובה חדשה",
        description: "תשובה עם תמונה או סרטון ממתינה לאישור. כותבת השאלה מקבלת התראה כשהתשובה מתפרסמת.",
        security: bearer,
        parameters: [idPath("מזהה השאלה")],
        requestBody: body(ref("AnswerCreate"), { body: "אפשר להשתמש בכף זרעי פשתן טחונים עם שלוש כפות מים במקום כל ביצה.", showContact: false }),
        responses: { 201: ok("נוצרה", ref("AnswerResponse")), 400: err("BadRequest"), 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("NotFound") },
      },
    },
    "/api/forum/answers/{id}": {
      patch: {
        tags: ["פורום"],
        summary: "עריכת תשובה (רק הכותב)",
        security: bearer,
        parameters: [idPath("מזהה התשובה")],
        requestBody: body(ref("AnswerUpdate"), { body: "תיקון: שתי כפות מים מספיקות." }),
        responses: {
          200: ok("עודכנה", ref("AnswerResponse")),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          403: err("Forbidden"),
          404: err("NotFound"),
        },
      },
      delete: {
        tags: ["פורום"],
        summary: "מחיקת תשובה (הכותב או מנהל)",
        security: bearer,
        parameters: [idPath("מזהה התשובה")],
        responses: { 204: ok("נמחקה"), 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("NotFound") },
      },
    },
    "/api/notifications": {
      get: {
        tags: ["התראות"],
        summary: "ההתראות שלי",
        security: bearer,
        parameters: [q("unreadOnly", { type: "string", enum: ["true", "false"] }, "true = רק שלא נקראו"), ...pageParams],
        responses: {
          200: ok("עמוד התראות", ref("NotificationPage"), {
            items: [
              {
                id: 10,
                type: "NEW_ANSWER",
                message: "התקבלה תשובה חדשה לשאלה שלך: \"למה עוגת השמרים שלי לא תופחת?\"",
                entityType: "question",
                entityId: 1,
                isRead: false,
                createdAt: "2026-10-25T09:00:00.000Z",
              },
            ],
            page: 1,
            pageSize: 12,
            total: 1,
            totalPages: 1,
            unreadCount: 1,
          }),
          401: err("Unauthorized"),
        },
      },
    },
    "/api/notifications/{id}/read": {
      patch: {
        tags: ["התראות"],
        summary: "סימון התראה כנקראה",
        security: bearer,
        parameters: [idPath("מזהה ההתראה")],
        responses: {
          200: ok("סומנה", { type: "object", properties: { notification: ref("Notification") } }),
          401: err("Unauthorized"),
          404: err("NotFound"),
        },
      },
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["התראות"],
        summary: "סימון כל ההתראות כנקראו",
        security: bearer,
        responses: { 200: ok("כמה סומנו", { type: "object", properties: { updated: { type: "integer" } } }, { updated: 3 }), 401: err("Unauthorized") },
      },
    },
    "/api/admin/pending": {
      get: {
        tags: ["ניהול"],
        summary: "תור אישורים (מנהל)",
        description: "מתכונים, שאלות ותשובות בסטטוס PENDING, מהוותיק לחדש.",
        security: bearer,
        parameters: [q("type", { type: "string", enum: ["recipes", "questions", "answers"] }, "סוג אחד בלבד")],
        responses: { 200: ok("התור", ref("PendingQueue")), 401: err("Unauthorized"), 403: err("Forbidden") },
      },
    },
    "/api/admin/moderation/{type}/{id}": {
      patch: {
        tags: ["ניהול"],
        summary: "אישור או דחייה (מנהל)",
        description: "הכותב מקבל התראה. אישור תשובה שולח גם התראה לכותבת השאלה.",
        security: bearer,
        parameters: [
          { name: "type", in: "path", required: true, schema: { type: "string", enum: ["recipes", "questions", "answers"] } },
          idPath("מזהה הפריט"),
        ],
        requestBody: body(ref("ModerationRequest"), { decision: "REJECTED", reason: "התמונה אינה קשורה למתכון" }),
        responses: {
          200: ok("עודכן", ref("ModerationResult"), { type: "recipes", id: 7, status: "REJECTED", rejectionReason: "התמונה אינה קשורה למתכון" }),
          400: err("BadRequest"),
          401: err("Unauthorized"),
          403: err("Forbidden"),
          404: err("NotFound"),
          409: { description: "הפריט אינו ממתין לאישור", ...json(ref("Error")) },
        },
      },
    },
    "/api/assistant/ask": {
      post: {
        tags: ["עוזר אישי"],
        summary: "שאלה לעוזר האישי (תוספת)",
        description: "מוצא מתכונים לפי מצרכים שכתובים בשפה חופשית. mode=basic בלי AI, mode=ai כשהוגדר מפתח AI בשרת.",
        security: optionalBearer,
        requestBody: body(ref("AssistantRequest"), { message: "יש לי ביצים, קישואים וגבינה. מה אפשר להכין?" }),
        responses: { 200: ok("תשובת העוזר", ref("AssistantResponse")), 400: err("BadRequest"), 429: err("TooMany") },
      },
    },
  },
} as const;
