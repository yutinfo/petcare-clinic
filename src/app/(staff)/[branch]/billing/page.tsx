import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { ForbiddenScreen } from "@/components/staff/forbidden";
import { findOpenCashierShift } from "@/modules/billing";
import { ForbiddenError, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { ShiftDesk } from "./desk";

export default async function BillingPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const shift = await findOpenCashierShift(ctx);
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="กะเงินสด"
          title={shift ? "กะที่เปิดอยู่" : "เปิดกะก่อนรับเงินสด"}
          description="ยอดที่ควรมี = เงินทอนตั้งต้น + เงินสดที่รับในกะนี้ · ผลต่างต้องมีเหตุผลและผู้จัดการอนุมัติ"
        />
        <ShiftDesk branch={branch} shift={shift} />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof ForbiddenError) {
      return <ForbiddenScreen title="กะเงินสด" hint="บัญชีนี้ยังไม่มีสิทธิ์เปิดหรือปิดกะ" />;
    }
    throw err;
  }
}
