import { BusinessError } from "@/modules/shared";
import type { AppContext } from "@/server/context";

export type SoapDraft = {
  encounterId: string;
  soapNoteId?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
};

export async function saveSoapDraft(ctx: AppContext, input: SoapDraft) {
  ctx.can("clinical:write");
  if (!ctx.actor.membershipId) throw new BusinessError("บัญชีนี้ยังไม่ได้ผูกเป็นพนักงาน");

  return ctx.tx(async (tx) => {
    const encounter = await tx.encounter.findFirst({ where: { id: input.encounterId } });
    if (!encounter) throw new BusinessError("ไม่พบเคส");
    ctx.can("clinical:write", { branchId: encounter.branchId });
    if (["CLOSED", "CANCELLED"].includes(encounter.status)) {
      throw new BusinessError("เคสนี้ปิดแล้ว");
    }

    if (input.soapNoteId) {
      const existing = await tx.soapNote.findFirst({ where: { id: input.soapNoteId } });
      if (!existing) throw new BusinessError("ไม่พบ SOAP");
      if (existing.signedAt) throw new BusinessError("เวชระเบียนที่ลงนามแล้วแก้ไขไม่ได้ — ใช้ addendum");
      const updated = await tx.soapNote.update({
        where: { id: existing.id },
        data: {
          subjective: input.subjective ?? existing.subjective,
          objective: input.objective ?? existing.objective,
          assessment: input.assessment ?? existing.assessment,
          plan: input.plan ?? existing.plan,
        },
      });
      return { id: updated.id, signedAt: null as string | null };
    }

    const unsigned = await tx.soapNote.findFirst({
      where: { encounterId: encounter.id, signedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (unsigned) {
      const updated = await tx.soapNote.update({
        where: { id: unsigned.id },
        data: {
          subjective: input.subjective ?? unsigned.subjective,
          objective: input.objective ?? unsigned.objective,
          assessment: input.assessment ?? unsigned.assessment,
          plan: input.plan ?? unsigned.plan,
        },
      });
      return { id: updated.id, signedAt: null as string | null };
    }

    const created = await tx.soapNote.create({
      data: {
        tenantId: ctx.tenantId,
        encounterId: encounter.id,
        subjective: input.subjective ?? null,
        objective: input.objective ?? null,
        assessment: input.assessment ?? null,
        plan: input.plan ?? null,
        authorId: ctx.actor.membershipId!,
      },
    });
    return { id: created.id, signedAt: null as string | null };
  });
}

export async function signSoap(ctx: AppContext, soapNoteId: string) {
  ctx.can("clinical:sign");
  return ctx.tx(async (tx) => {
    const note = await tx.soapNote.findFirst({
      where: { id: soapNoteId },
      include: { encounter: { select: { branchId: true } } },
    });
    if (!note) throw new BusinessError("ไม่พบ SOAP");
    ctx.can("clinical:sign", { branchId: note.encounter.branchId });
    if (note.signedAt) throw new BusinessError("ลงนามไปแล้ว");
    if (!note.assessment && !note.plan) {
      throw new BusinessError("กรอกการวินิจฉัยหรือแผนการรักษาก่อนลงนาม");
    }
    const signed = await tx.soapNote.update({
      where: { id: note.id },
      data: { signedAt: new Date(), signedById: ctx.actor.membershipId ?? ctx.actor.userId },
    });
    ctx.emit("soap.signed", { soapNoteId: signed.id, encounterId: signed.encounterId });
    return { id: signed.id, signedAt: signed.signedAt!.toISOString() };
  });
}

export async function addSoapAddendum(
  ctx: AppContext,
  input: { soapNoteId: string; content: string; reason: string },
) {
  ctx.can("clinical:addendum");
  const content = input.content.trim();
  const reason = input.reason.trim();
  if (!content) throw new BusinessError("กรอกข้อความ addendum");
  if (!reason) throw new BusinessError("ต้องระบุเหตุผล");

  return ctx.tx(async (tx) => {
    const note = await tx.soapNote.findFirst({
      where: { id: input.soapNoteId },
      include: { encounter: { select: { branchId: true } } },
    });
    if (!note) throw new BusinessError("ไม่พบ SOAP");
    ctx.can("clinical:addendum", { branchId: note.encounter.branchId });
    if (!note.signedAt) throw new BusinessError("ยังไม่ลงนาม — แก้ร่างได้เลย ไม่ต้องใช้ addendum");
    const row = await tx.soapAddendum.create({
      data: {
        tenantId: ctx.tenantId,
        soapNoteId: note.id,
        content,
        reason,
        authorId: ctx.actor.membershipId ?? ctx.actor.userId,
      },
    });
    ctx.emit("soap.addendum_added", { soapNoteId: note.id, addendumId: row.id });
    return { id: row.id };
  });
}
