import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { listGroomingQueue } from "@/modules/grooming";
import { UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { GroomingDesk } from "./desk";

export default async function GroomingPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const rows = await listGroomingQueue(ctx);
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="อาบน้ำตัดขน"
          title="คิวช่างวันนี้"
          description="เปิดคิวจากชื่อสัตว์ แล้วเลื่อนสถานะทีละขั้นจนส่งมอบ — ค่าบริการเข้าบิลอัตโนมัติ"
        />
        <GroomingDesk branch={branch} rows={rows} />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
