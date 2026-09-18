import path from "node:path";
import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

async function lint(code: string, filePath: string) {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.ruleId === "no-restricted-imports") ?? [];
}

describe("กฎ import ข้ามโมดูล", () => {
  it("บล็อก alias ลึกเข้าไฟล์ในโมดูลอื่น", async () => {
    const msgs = await lint(
      `import { saveSoapDraft } from "@/modules/clinical/soap";\n`,
      path.join(process.cwd(), "src/modules/billing/invoice.ts"),
    );
    expect(msgs.length).toBeGreaterThan(0);
  });

  it("บล็อก relative path ข้ามโมดูล", async () => {
    const msgs = await lint(
      `import { saveSoapDraft } from "../clinical/soap";\n`,
      path.join(process.cwd(), "src/modules/billing/invoice.ts"),
    );
    expect(msgs.length).toBeGreaterThan(0);
  });

  it("อนุญาต public API และไฟล์ในโมดูลเดียวกัน", async () => {
    const publicApi = await lint(
      `import { saveSoapDraft } from "@/modules/clinical";\n`,
      path.join(process.cwd(), "src/modules/billing/invoice.ts"),
    );
    expect(publicApi).toHaveLength(0);
    const sameModule = await lint(
      `import { calculateDose } from "./dose";\n`,
      path.join(process.cwd(), "src/modules/pharmacy/prescribe.ts"),
    );
    expect(sameModule).toHaveLength(0);
  });
});
