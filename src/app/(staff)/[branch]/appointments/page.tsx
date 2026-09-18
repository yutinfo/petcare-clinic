import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { listBookingsForDay } from "@/modules/scheduling";
import { UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { AppointmentDesk } from "./desk";

export default async function AppointmentsPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const rows = await listBookingsForDay(ctx);
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="นัดหมาย"
          title="ตารางวันนี้"
          description="จองนัดจากชื่อลูกค้า · คำขอจากพอร์ทัลจะขึ้นสถานะรออนุมัติ"
        />
        <AppointmentDesk branch={branch} rows={rows} />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
