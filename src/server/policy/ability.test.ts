import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/modules/shared";
import { buildAbility } from "./ability";

const receptionist = {
  kind: "staff",
  permissions: new Set(["patient:read", "billing:invoice"]),
  branchIds: new Set(["branch-a"]),
};

describe("RBAC", () => {
  it("อนุญาตสิทธิ์ที่มี และปฏิเสธสิทธิ์ที่ไม่มี", () => {
    const ability = buildAbility(receptionist);
    expect(ability.can("patient:read")).toBe(true);
    expect(ability.can("clinical:sign")).toBe(false);
    expect(() => ability.assert("clinical:sign")).toThrow(ForbiddenError);
  });

  it("กันข้ามสาขาถ้าไม่มี report:tenant", () => {
    const ability = buildAbility(receptionist);
    expect(ability.can("billing:invoice", { branchId: "branch-a" })).toBe(true);
    expect(ability.can("billing:invoice", { branchId: "branch-b" })).toBe(false);
  });
});
