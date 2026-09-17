import type { PrismaClient } from "@prisma/client";

const BATCH = 50;

/** ดึง OutboxEvent ที่ยังไม่ประมวลผล — งานนี้ต้อง idempotent */
export async function drainOutbox(db: PrismaClient): Promise<number> {
  const events = await db.outboxEvent.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let processed = 0;
  for (const event of events) {
    try {
      await handleOutboxEvent(event.type, event.payload);
      await db.outboxEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), lastError: null },
      });
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.outboxEvent.update({
        where: { id: event.id },
        data: { attempts: { increment: 1 }, lastError: message.slice(0, 1000) },
      });
    }
  }
  return processed;
}

async function handleOutboxEvent(type: string, payload: unknown): Promise<void> {
  // เฟส 0: รับรู้ event แล้วถือว่าสำเร็จ — ผู้ฟังจริงต่อในเฟสถัดไป
  void type;
  void payload;
}
