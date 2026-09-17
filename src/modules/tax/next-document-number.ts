import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * จองเลขที่เอกสารในทรานแซกชันเดียวกับการออกบิล
 * ห้ามเรียกตอนสร้างร่าง — ดู docs/06-billing-pos-and-tax.md §5
 */
export async function nextDocumentNumber(
  tx: Tx,
  tenantId: string,
  branchId: string,
  docType: string,
  period: string,
): Promise<number> {
  const rows = await tx.$queryRaw<{ last_number: number }[]>`
    INSERT INTO "DocumentSequence" (tenant_id, branch_id, doc_type, period, last_number, updated_at)
    VALUES (${tenantId}::uuid, ${branchId}::uuid, ${docType}, ${period}, 1, now())
    ON CONFLICT (tenant_id, branch_id, doc_type, period)
    DO UPDATE SET last_number = "DocumentSequence".last_number + 1,
                  updated_at = now()
    RETURNING last_number`;

  const last = rows[0]?.last_number;
  if (last == null) {
    throw new Error("จองเลขที่เอกสารไม่สำเร็จ");
  }
  return last;
}

export function formatDocumentNumber(
  prefix: string,
  branchCode: string,
  period: string,
  sequence: number,
): string {
  return `${prefix}-${branchCode}-${period}-${sequence.toString().padStart(6, "0")}`;
}
