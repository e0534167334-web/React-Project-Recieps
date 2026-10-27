// מייצא את תיעוד ה־API לקובץ docs/openapi.json
// הרצה: npm run openapi:export
import { mkdirSync, writeFileSync } from "node:fs";
import { openApiDocument } from "../src/docs/openapi.js";

mkdirSync("docs", { recursive: true });
writeFileSync("docs/openapi.json", JSON.stringify(openApiDocument, null, 2) + "\n", "utf8");
console.log("נוצר docs/openapi.json");
