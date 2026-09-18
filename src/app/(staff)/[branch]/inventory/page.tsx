import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { ForbiddenScreen } from "@/components/staff/forbidden";
import { listStockOnHand, searchProducts } from "@/modules/inventory";
import { ForbiddenError, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { InventoryDesk } from "./desk";

export default async function InventoryPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const [stock, products] = await Promise.all([listStockOnHand(ctx), searchProducts(ctx, "")]);
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="คลังสินค้า"
          title="ยอดคงเหลือตามล็อต"
          description="รับของเข้าเป็นล็อตพร้อมวันหมดอายุ · ตัดสต็อกด้วยรายการเคลื่อนไหวเท่านั้น"
        >
          <Link
            href={`/${branch}/inventory/controlled`}
            className="inline-flex h-11 items-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium hover:bg-cream"
          >
            ทะเบียนยาควบคุม
          </Link>
        </PageHeader>
        <InventoryDesk branch={branch} stock={stock} products={products} />
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof ForbiddenError) {
      return <ForbiddenScreen title="คลังสินค้า" hint="เข้าด้วยบัญชีคลัง jo@demo.local / demo1234" />;
    }
    throw err;
  }
}
