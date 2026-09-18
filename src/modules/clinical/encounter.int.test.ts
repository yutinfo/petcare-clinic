import { beforeAll, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/modules/shared";
import { checkInPet, getEncounterWorkspace, saveSoapDraft, signSoap } from "@/modules/clinical";
import { createAppContext } from "@/server/context";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { seedMiniClinic } from "@/test/clinic-fixture";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("สิทธิ์ห้องตรวจ", () => {
  it("patient:read อย่างเดียวอ่าน SOAP ไม่ได้", async () => {
    const f = await seedMiniClinic(h.migrator);
    const checked = await checkInPet(f.ctx, { petId: f.pet.id, weightKg: "5.2" });
    const draft = await saveSoapDraft(f.ctx, {
      encounterId: checked.encounterId,
      assessment: "ข้อมูลตรวจเฉพาะแพทย์",
    });
    await signSoap(f.ctx, draft.id);

    const receptionist = createAppContext({
      db: h.migrator,
      tenantId: f.tenantId,
      branchId: f.branchId,
      actor: {
        userId: f.actorId,
        membershipId: f.actorId,
        displayName: "นุ่น",
        kind: "staff",
        permissions: new Set(["patient:read"]),
        branchIds: new Set([f.branchId]),
      },
    });
    const workspace = await getEncounterWorkspace(receptionist, checked.encounterId);
    expect(workspace.soapNotes).toEqual([]);
    expect(workspace.priorSoap).toEqual([]);
    expect(workspace.pet.name).toBe("โบ้");
  });

  it("อ่านเคสข้ามสาขาที่ไม่มีสิทธิ์ไม่ได้", async () => {
    const f = await seedMiniClinic(h.migrator);
    const checked = await checkInPet(f.ctx, { petId: f.pet.id, weightKg: "5.2" });
    const other = await h.migrator.branch.create({
      data: { tenantId: f.tenantId, code: "OTHER", name: "อีกสาขา" },
    });
    const restricted = createAppContext({
      db: h.migrator,
      tenantId: f.tenantId,
      branchId: other.id,
      actor: {
        userId: f.actorId,
        membershipId: f.actorId,
        displayName: "สาขาอื่น",
        kind: "staff",
        permissions: new Set(["patient:read", "clinical:read"]),
        branchIds: new Set([other.id]),
      },
    });
    await expect(getEncounterWorkspace(restricted, checked.encounterId)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
