-- אילוצי תקינות ברמת מסד הנתונים (שכבת הגנה נוספת מעבר לולידציה בשרת)

ALTER TABLE "recipes" ADD CONSTRAINT "recipes_prepTimeMinutes_range" CHECK ("prepTimeMinutes" IS NULL OR ("prepTimeMinutes" BETWEEN 1 AND 1440));
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_servings_range" CHECK ("servings" IS NULL OR ("servings" BETWEEN 1 AND 100));
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_title_not_blank" CHECK (length(btrim("title")) >= 2);

ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_position_nonnegative" CHECK ("position" >= 0);
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_text_not_blank" CHECK (length(btrim("text")) >= 1);

ALTER TABLE "categories" ADD CONSTRAINT "categories_name_not_blank" CHECK (length(btrim("name")) >= 2);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_entityType_valid" CHECK ("entityType" IN ('recipe', 'question', 'answer'));
