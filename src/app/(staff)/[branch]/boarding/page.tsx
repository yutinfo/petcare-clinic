import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { listKennelBoard } from "@/modules/boarding";
import { UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { KennelMap } from "./map";

export default async function BoardingPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const kennels = await listKennelBoard(ctx);
    const occupied = kennels.filter((k) => k.stay).length;
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="ฝากเลี้ยง"
          title="ผังกรง"
          description={`ใช้อยู่ ${occupied} จาก ${kennels.length} กรง · กดกรงว่างเพื่อรับฝาก กดกรงที่มีสัตว์เพื่อบันทึกดูแลหรือเช็คเอาท์`}
        />
        <KennelMap branch={branch} kennels={kennels} />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
