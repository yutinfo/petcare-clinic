import { getPgHarness } from "../src/test/pg-harness";
import { addLot, seedMiniClinic } from "../src/test/clinic-fixture";
import { createAppContext } from "../src/server/context";
import { checkInPet, saveSoapDraft, signSoap, getEncounterWorkspace } from "../src/modules/clinical";
import { prescribe, dispensePrescription } from "../src/modules/pharmacy";
import { issueInvoiceFromCharges } from "../src/modules/billing";
import { checkOutStay } from "../src/modules/boarding";
import { bangkokBusinessDate } from "../src/modules/shared";

// หลักฐาน defect ใช้ฐานข้อมูลชั่วคราวเท่านั้น; ผลที่พิมพ์คือพฤติกรรมจริง ไม่ใช่เกณฑ์ว่าเทสผ่าน
async function main() {
  const h = await getPgHarness();
  try {
    const f = await seedMiniClinic(h.migrator);
    const context = () => createAppContext({ db: h.app, tenantId: f.tenantId, branchId: f.branchId, actor: f.ctx.actor });
    const ctx = context();
    const encounter = await checkInPet(ctx, { petId: f.pet.id, weightKg: "12.4" });
    const soap = await saveSoapDraft(ctx, { encounterId: encounter.encounterId, assessment: "ข้อมูลตรวจเฉพาะแพทย์" });
    await signSoap(ctx, soap.id);
    const receptionist = createAppContext({ db: h.app, tenantId: f.tenantId, branchId: f.branchId,
      actor: { ...f.ctx.actor, kind: "staff", permissions: new Set(["patient:read"]), branchIds: new Set([f.branchId]) } });
    const workspace = await getEncounterWorkspace(receptionist, encounter.encounterId);
    console.info("DEF-02", { permissions: ["patient:read"], assessment: workspace.soapNotes[0]?.assessment });
    await ctx.tx(tx => tx.soapNote.update({ where: { id: soap.id }, data: { signedAt: null } }));
    await saveSoapDraft(ctx, { encounterId: encounter.encounterId, soapNoteId: soap.id, assessment: "แก้หลังลงนาม" });
    console.info("DEF-03", { signedSoapRewritten: true });

    await addLot(h.migrator, { ...f, productId: f.product.id, lotNo: "EXPIRED", expiry: "2000-01-01", qty: 100 });
    const rx = await prescribe(ctx, { encounterId: encounter.encounterId, productId: f.product.id,
      mgPerKg: "20", route: "PO", frequencyCode: "BID", durationDays: 7 });
    const dispensed = await dispensePrescription(ctx, { prescriptionId: rx.id });
    console.info("DEF-01", { expiredLotDispensed: dispensed.lots[0] });

    const otherBranch = await h.migrator.branch.create({ data: { tenantId: f.tenantId, code: "OTHER", name: "อีกสาขา" } });
    const restricted = createAppContext({ db: h.app, tenantId: f.tenantId, branchId: otherBranch.id,
      actor: { ...f.ctx.actor, kind: "staff", permissions: new Set(["patient:read", "clinical:read"]), branchIds: new Set([otherBranch.id]) } });
    const crossBranch = await getEncounterWorkspace(restricted, encounter.encounterId);
    console.info("DEF-07", { allowedBranch: otherBranch.id, encounterBranch: f.branchId, readEncounter: crossBranch.id });

    const charges = await ctx.tx(tx => tx.chargeItem.findMany({ where: { encounterId: encounter.encounterId } }));
    const invoices = await Promise.allSettled([0, 1].map(() => issueInvoiceFromCharges(context(), {
      chargeIds: charges.map(c => c.id), method: "CASH",
    })));
    console.info("DEF-04", invoices.map(r => r.status === "fulfilled" ? { number: r.value.number, paid: r.value.paidSatang } : { error: String(r.reason) }));
    const issued = invoices.find(r => r.status === "fulfilled");
    if (issued?.status === "fulfilled") {
      await ctx.tx(tx => tx.invoice.update({ where: { id: issued.value.id }, data: { status: "DRAFT" } }));
      const changed = await ctx.tx(tx => tx.invoice.update({ where: { id: issued.value.id }, data: { grandTotalSatang: 1 } }));
      console.info("DEF-05", { issuedInvoiceRewrittenToSatang: changed.grandTotalSatang });
    }

    const kennel = await h.migrator.resource.create({ data: { tenantId: f.tenantId, branchId: f.branchId, type: "KENNEL", code: "REVIEW", name: "กรงทดสอบ" } });
    const today = bangkokBusinessDate(new Date());
    const yesterday = new Date(`${today}T00:00:00+07:00`);
    yesterday.setTime(yesterday.getTime() - 86400000);
    const stay = await h.migrator.stay.create({ data: { tenantId: f.tenantId, branchId: f.branchId, code: "REVIEW", type: "BOARDING",
      status: "CHECKED_IN", petId: f.pet.id, ownerId: f.owner.id, kennelResourceId: kennel.id,
      checkInAt: yesterday, expectedOutAt: new Date(Date.now() + 86400000), dailyRateServiceId: f.board.id, dailyRateSatang: 50000 } });
    await checkOutStay(ctx, stay.id);
    const nights = await ctx.tx(tx => tx.chargeItem.findMany({ where: { stayId: stay.id } }));
    console.info("DEF-06", { oneNightStayCharged: nights.map(n => ({ description: n.description, amount: n.amountSatang })) });
  } finally {
    await h.stop();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
