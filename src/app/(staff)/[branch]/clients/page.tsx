import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { searchClients } from "@/modules/crm";
import { UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { ClientSearch } from "./search";

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branch: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { branch } = await params;
  const { q } = await searchParams;
  try {
    const ctx = await getStaffContext(branch);
    const hits = q && q.length >= 2 ? await searchClients(ctx, q) : [];
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="ทะเบียน"
          title="ลูกค้าและสัตว์เลี้ยง"
          description="ค้นแล้วเปิดการ์ดลูกค้าเพื่อดูสัตว์ ใบเสร็จ หรือไปเปิดเคส"
        />
        <ClientSearch branch={branch} initialQuery={q ?? ""} hits={hits} />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
