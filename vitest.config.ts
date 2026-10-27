import { defineConfig } from "vitest/config";

// הבדיקות רצות מול מסד נתונים PostgreSQL אמיתי ונפרד (TEST_DATABASE_URL).
// כל בדיקה מתחילה ממסד נתונים ריק.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/recipes_test",
      JWT_SECRET: "test-secret-that-is-long-enough-1234567890",
      JWT_EXPIRES_IN: "1h",
      AUTH_RATE_LIMIT_MAX: "1000",
      CORS_ORIGINS: "http://localhost:5173",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      AI_API_KEY: "",
      MAX_IMAGE_MB: "1",
    },
  },
});
