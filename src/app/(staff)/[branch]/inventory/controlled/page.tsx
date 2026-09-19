import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { ForbiddenScreen } from "@/components/staff/forbidden";
import { getControlledRegister, listControlledProducts } from "@/modules/inventory";
import { bangkokBusinessDate, ForbiddenError, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { ControlledRegisterDesk } from "./desk";

export default async function ControlledRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ branch: string }>;
  searchParams: Promise<{ productId?: string; month?: string }>;
}) {
  const { branch } = await params;
  const { productId, month } = await searchParams;
  try {
    const ctx = await getStaffContext(branch);
    const products = await listControlledProducts(ctx);
    const yearMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : bangkokBusinessDate().slice(0, 7);
    const selected = productId && products.some((p) => p.id === productId) ? productId : products[0]?.id;
    const report = selected ? await getControlledRegister(ctx, { productId: selected, yearMonth }) : null;
    return (
      <div className="space-y-5">
        <div className="no-print">
          <PageHeader
            eyebrow="ยาควบคุม"
            title="ทะเบียนยาควบคุม"
            description="หนึ่งแผ่นต่อยาหนึ่งรายการต่อสาขาต่อเดือน · ยอดคงเหลือตามที่บันทึกตอนรับเข้าหรือจ่ายออก ไม่คำนวณย้อนใหม่"
          />
        </div>
        <ControlledRegisterDesk
          branch={branch}
          products={products}
          yearMonth={yearMonth}
          productId={selected ?? ""}
          report={report}
        />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof ForbiddenError) {
      return (
        <ForbiddenScreen title="ทะเบียนยาควบคุม" hint="เข้าด้วยบัญชีคลังยา jo@demo.local / demo1234" />
      );
    }
    throw err;
  }
}
