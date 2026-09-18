import { headers } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { tenantSlugFromHost } from "@/server/tenancy";

/** ชื่อคลินิกจาก subdomain ใช้กับหน้าสาธารณะที่ยังไม่มีเซสชัน — null = เปิดจากโดเมนกลาง */
export async function getPublicTenantName(): Promise<string | null> {
  const slug = tenantSlugFromHost((await headers()).get("host"));
  if (!slug) return null;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { displayName: true },
  });
  return tenant?.displayName ?? null;
}
