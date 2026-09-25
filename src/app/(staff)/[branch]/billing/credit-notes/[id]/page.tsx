import { redirect } from "next/navigation";
import { ForbiddenScreen } from "@/components/staff/forbidden";
import { getCreditNote } from "@/modules/billing";
import { BusinessError, ForbiddenError, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { CreditNotePrint } from "../../credit-note-print";

export default async function CreditNotePage({
  params,
}: {
  params: Promise<{ branch: string; id: string }>;
}) {
  const { branch, id } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const note = await getCreditNote(ctx, id);
    return <CreditNotePrint branch={branch} note={note} />;
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof ForbiddenError) {
      return <ForbiddenScreen title="ใบลดหนี้" hint="บัญชีนี้ยังดูเอกสารการเงินไม่ได้" />;
    }
    if (err instanceof BusinessError) {
      return <ForbiddenScreen title="ใบลดหนี้" hint={err.message} />;
    }
    throw err;
  }
}
