import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { ForbiddenScreen } from "@/components/staff/forbidden";
import { listPendingPrescriptions } from "@/modules/pharmacy";
import { ForbiddenError, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { PharmacyQueue } from "./queue";

export default async function PharmacyPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const rows = await listPendingPrescriptions(ctx);
    return (
      <div className="space-y-5">
        <div className="no-print">
          <PageHeader
            eyebrow="ห้องยา"
            title="คิวจ่ายยา"
            description="กดจ่ายยาแล้วระบบตัดล็อตที่หมดอายุก่อน พร้อมตั้งค่าใช้จ่ายในบิลเคส"
          />
        </div>
        <PharmacyQueue branch={branch} rows={rows} />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof ForbiddenError) {
      return (
        <ForbiddenScreen
          title="ห้องยา"
          hint="เข้าด้วยบัญชีเภสัช jo@demo.local หรือหมอเอก ek@demo.local — รหัส demo1234"
        />
      );
    }
    throw err;
  }
}
