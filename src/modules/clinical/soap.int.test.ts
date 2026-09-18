import { beforeAll, describe, expect, it } from "vitest";
import { checkInPet, saveSoapDraft, signSoap, addSoapAddendum } from "@/modules/clinical";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";
import { seedMiniClinic } from "@/test/clinic-fixture";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("SOAP", () => {
  it("ลงนามแล้วแก้เนื้อหาไม่ได้ ต้องใช้ addendum", async () => {
    const f = await seedMiniClinic(h.migrator);
    const checked = await checkInPet(f.ctx, { petId: f.pet.id, weightKg: "5.2" });
    const draft = await saveSoapDraft(f.ctx, {
      encounterId: checked.encounterId,
      assessment: "otitis",
      plan: "ยาหยอดหู",
    });
    const signed = await signSoap(f.ctx, draft.id);
    expect(signed.signedAt).toBeTruthy();

    await expect(
      saveSoapDraft(f.ctx, { encounterId: checked.encounterId, soapNoteId: draft.id, plan: "แก้" }),
    ).rejects.toThrow(/ลงนาม/);

    const add = await addSoapAddendum(f.ctx, {
      soapNoteId: draft.id,
      content: "เพิ่มคำแนะนำ",
      reason: "ลืมเขียน",
    });
    expect(add.id).toBeTruthy();

    await expect(
      f.ctx.tx((tx) => tx.soapNote.update({ where: { id: draft.id }, data: { signedAt: null } })),
    ).rejects.toThrow(/ลงนาม|addendum|P0001/);
  });
});
