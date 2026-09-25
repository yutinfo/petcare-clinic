import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { BusinessError } from "@/modules/shared";
import { writeAuditLog } from "@/server/audit";
import type { AppContext } from "@/server/context";

const ENTITY = ["Product", "ServiceItem", "ServicePackage", "Role"] as const;
const FIELD = ["name", "description"] as const;

const rowSchema = z.object({
  entityType: z.enum(ENTITY),
  entityId: z.string().uuid("รหัสรายการไม่ถูกต้อง"),
  field: z.enum(FIELD),
  locale: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}(-[a-z]{2})?$/, "รหัสภาษาไม่ถูกต้อง"),
  text: z.string().trim().min(1, "คำแปลว่างไม่ได้").max(2000, "คำแปลยาวเกิน 2000 ตัวอักษร"),
});

export type CatalogTranslationInput = z.infer<typeof rowSchema>;

export async function importCatalogTranslations(ctx: AppContext, rawRows: CatalogTranslationInput[]) {
  ctx.can("admin:users");
  if (!ctx.branchId) throw new BusinessError("ต้องระบุสาขา");
  if (rawRows.length === 0) throw new BusinessError("ไม่มีรายการให้นำเข้า");
  if (rawRows.length > 500) throw new BusinessError("นำเข้าได้ไม่เกิน 500 แถวต่อครั้ง");
  const rows = rawRows.map((row, index) => {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      throw new BusinessError(`แถว ${index + 1}: ${parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"}`);
    }
    return parsed.data;
  });

  return ctx.tx(async (tx) => {
    for (const row of rows) {
      await assertEntity(tx, ctx.tenantId, row.entityType, row.entityId);
      await tx.catalogTranslation.upsert({
        where: {
          tenantId_entityType_entityId_field_locale: {
            tenantId: ctx.tenantId,
            entityType: row.entityType,
            entityId: row.entityId,
            field: row.field,
            locale: row.locale,
          },
        },
        create: { tenantId: ctx.tenantId, ...row },
        update: { text: row.text },
      });
    }
    await writeAuditLog(tx, ctx, {
      action: "catalog_translation.imported",
      entityType: "CatalogTranslation",
      after: { count: rows.length, locales: [...new Set(rows.map((row) => row.locale))] },
    });
    return { count: rows.length };
  });
}

async function assertEntity(
  tx: Prisma.TransactionClient,
  tenantId: string,
  entityType: CatalogTranslationInput["entityType"],
  entityId: string,
) {
  const where = { id: entityId, OR: [{ tenantId }, { tenantId: null }] };
  const found =
    entityType === "Product"
      ? await tx.product.findFirst({ where: { id: entityId, tenantId } })
      : entityType === "ServiceItem"
        ? await tx.serviceItem.findFirst({ where: { id: entityId, tenantId } })
        : entityType === "ServicePackage"
          ? await tx.servicePackage.findFirst({ where: { id: entityId, tenantId } })
          : await tx.role.findFirst({ where });
  if (!found) throw new BusinessError("ไม่พบรายการที่จะใส่คำแปล");
}
