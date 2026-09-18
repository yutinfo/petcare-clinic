import { beforeAll, describe, expect, it } from "vitest";
import { checkInPet, saveSoapDraft, signSoap, addSoapAddendum } from "@/modules/clinical";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { seedMiniClinic, staffContext } from "@/test/clinic-fixture";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("SOAP", () => {
  it("ลงนามแล้วแก้เนื้อหาไม่ได้ ต้องใช้ addendum", async () => {
    const f = await seedMiniClinic(h.migrator);
    const ctx = staffContext(h.app, f);
    const checked = await checkInPet(ctx, { petId: f.pet.id, weightKg: "5.2" });
    const draft = await saveSoapDraft(ctx, {
      encounterId: checked.encounterId,
      assessment: "otitis",
      plan: "ยาหยอดหู",
    });
    const signed = await signSoap(ctx, draft.id);
    expect(signed.signedAt).toBeTruthy();
    const logs = await h.migrator.auditLog.findMany({ where: { entityId: draft.id } });
    expect(logs.some((l) => l.action === "soap.signed")).toBe(true);

    await expect(
      saveSoapDraft(ctx, { encounterId: checked.encounterId, soapNoteId: draft.id, plan: "แก้" }),
    ).rejects.toThrow(/ลงนาม/);

    const add = await addSoapAddendum(ctx, {
      soapNoteId: draft.id,
      content: "เพิ่มคำแนะนำ",
      reason: "ลืมเขียน",
    });
    expect(add.id).toBeTruthy();

    await expect(
      h.migrator.soapNote.update({ where: { id: draft.id }, data: { signedAt: null } }),
    ).rejects.toThrow(/ลงนาม|addendum|P0001/);
  });
});
