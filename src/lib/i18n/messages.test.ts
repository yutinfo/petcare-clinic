import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import th from "./messages/th.json";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      leafKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("คลังข้อความ", () => {
  it("th.json และ en.json มีคีย์เท่ากัน", () => {
    expect(leafKeys(en).sort()).toEqual(leafKeys(th).sort());
  });
});
