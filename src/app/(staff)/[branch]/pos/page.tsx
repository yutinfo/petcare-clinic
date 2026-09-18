import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { ForbiddenScreen } from "@/components/staff/forbidden";
import { getInvoice, listOpenCharges, listRecentInvoices } from "@/modules/billing";
import { searchProducts } from "@/modules/inventory";
import { ForbiddenError, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { PosDesk } from "./desk";
import { ReceiptCard } from "./receipt";

export default async function PosPage({
  params,
  searchParams,
}: {
  params: Promise<{ branch: string }>;
  searchParams: Promise<{ invoice?: string }>;
}) {
  const { branch } = await params;
  const { invoice: invoiceId } = await searchParams;
  try {
    const ctx = await getStaffContext(branch);
    if (invoiceId) {
      const invoice = await getInvoice(ctx, invoiceId);
      return <ReceiptCard branch={branch} invoice={invoice} />;
    }
    const [products, openCharges, recent] = await Promise.all([
      searchProducts(ctx, ""),
      listOpenCharges(ctx),
      listRecentInvoices(ctx),
    ]);
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="ขายหน้าร้าน + ชำระเงิน"
          title="คิดเงินใบเดียวจบ"
          description="รายการค้างจากห้องตรวจ ยา ฝากเลี้ยง รวมกับของหน้าร้านได้ในบิลเดียวกัน"
        />
        <PosDesk branch={branch} products={products} openCharges={openCharges} recent={recent} />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof ForbiddenError) {
      return <ForbiddenScreen title="ขายหน้าร้าน" hint="บัญชีนี้ยังไม่มีสิทธิ์คิดเงิน" />;
    }
    throw err;
  }
}
