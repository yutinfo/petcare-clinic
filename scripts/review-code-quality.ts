import { ESLint } from "eslint";
import { getPgHarness } from "../src/test/pg-harness";
import { seedMiniClinic } from "../src/test/clinic-fixture";
import { createAppContext } from "../src/server/context";
import { checkInPet, saveSoapDraft, signSoap } from "../src/modules/clinical";
import { prescribe } from "../src/modules/pharmacy";

// ทำซ้ำข้อค้นพบในฐานข้อมูลชั่วคราว; ผลที่พิมพ์ไม่ใช่ assertion ว่าพฤติกรรมถูกต้อง
async function main() {
  const eslint = new ESLint();
  for (const path of ["@/modules/clinical/soap", "../clinical/soap"]) {
    const results = await eslint.lintText(`import { signSoap } from "${path}";\nexport { signSoap };\n`, {
      filePath: "src/modules/billing/review-probe.ts",
    });
    console.info("CQ-06", { path, errors: results.flatMap(result => result.messages.map(message => message.ruleId)) });
  }
  const h = await getPgHarness();
  try {
    const f = await seedMiniClinic(h.migrator);
    const ctx = createAppContext({ db: h.app, tenantId: f.tenantId, branchId: f.branchId,
      actor: { ...f.ctx.actor, kind: "staff", permissions: new Set(["scheduling:write", "clinical:write", "clinical:sign", "pharmacy:prescribe"]), branchIds: new Set([f.branchId]) } });
    const checked = await checkInPet(ctx, { petId: f.pet.id, weightKg: "4" });
    const rx = await prescribe(ctx, { encounterId: checked.encounterId, productId: f.product.id,
      doseAmount: "-2", durationDays: 7, route: "PO", frequencyCode: "BID" });
    console.info("CQ-01", { doseAmount: rx.doseAmount, totalQtyBase: rx.totalQtyBase, instruction: rx.instructionTh });
    const note = await saveSoapDraft(ctx, { encounterId: checked.encounterId, assessment: "บันทึกทดสอบคุณภาพ" });
    await signSoap(ctx, note.id);
    console.info("CQ-03", { signed: true, auditRows: await ctx.tx(tx => tx.auditLog.count()) });

    try {
      await ctx.tx(async tx => {
        await tx.owner.create({ data: { tenantId: f.tenantId, code: "ROLLBACK-PROBE", firstName: "ต้องย้อนกลับ", searchKey: "" } });
        ctx.emit("review.rolled_back", { code: "ROLLBACK-PROBE" });
        throw new Error("ตั้งใจ rollback เพื่อทดสอบ event");
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "ตั้งใจ rollback เพื่อทดสอบ event") throw error;
    }
    await ctx.tx(tx => tx.owner.count());
    console.info("CQ-02", await ctx.tx(async tx => ({
      ownerRows: await tx.owner.count({ where: { code: "ROLLBACK-PROBE" } }),
      eventRows: await tx.outboxEvent.count({ where: { type: "review.rolled_back" } }),
    })));
  } finally {
    await h.stop();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
