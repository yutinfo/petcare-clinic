import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*"],
              message: "modules ห้าม import จาก next/* — ดู AGENTS.md §6",
            },
            {
              group: ["@/app", "@/app/*"],
              message: "modules ห้าม import จาก app/",
            },
            {
              group: ["@/modules/*/*", "@/modules/*/*/**"],
              message:
                "เรียกข้ามโมดูลได้เฉพาะผ่าน @/modules/<name> (public API ที่ index.ts)",
            },
            {
              group: [
                "../billing",
                "../billing/**",
                "../boarding",
                "../boarding/**",
                "../clinical",
                "../clinical/**",
                "../crm",
                "../crm/**",
                "../grooming",
                "../grooming/**",
                "../identity",
                "../identity/**",
                "../inventory",
                "../inventory/**",
                "../notification",
                "../notification/**",
                "../patient",
                "../patient/**",
                "../pharmacy",
                "../pharmacy/**",
                "../reporting",
                "../reporting/**",
                "../scheduling",
                "../scheduling/**",
                "../shared",
                "../shared/**",
                "../tax",
                "../tax/**",
              ],
              message:
                "เรียกข้ามโมดูลด้วย relative path ไม่ได้ — ใช้ @/modules/<name>",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
