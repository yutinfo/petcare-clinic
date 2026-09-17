import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * ตั้ง app.tenant_id แบบ local ต่อทรานแซกชัน — ปลอดภัยกับ connection pool
 * งานที่มีหลายคำสั่งให้เปิดทรานแซกชันเองแล้วเรียก set_config ครั้งเดียวที่ต้นเรื่อง
 * (ดู docs/01-architecture.md §3.2)
 */
export async function withTenant<T>(
  db: PrismaClient,
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

export async function setTenantLocal(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
}
