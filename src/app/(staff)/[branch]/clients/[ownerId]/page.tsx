import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { INVOICE_STATUS } from "@/components/staff/labels";
import { EmptyState, PageHeader, StatusBadge } from "@/components/staff/ui";
import { getOwnerProfile } from "@/modules/crm";
import { BusinessError, formatSatangTh, UnauthenticatedError } from "@/modules/shared";
import { formatThaiDateTime } from "@/modules/shared/date";
import { getStaffContext } from "@/server/staff-context";

export default async function OwnerProfilePage({
  params,
}: {
  params: Promise<{ branch: string; ownerId: string }>;
}) {
  const { branch, ownerId } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const owner = await getOwnerProfile(ctx, ownerId);
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="ทะเบียนลูกค้า"
          title={owner.name}
          description={[owner.code, owner.phone, owner.address].filter(Boolean).join(" · ")}
        >
          <Link
            href={`/${branch}/reception?q=${encodeURIComponent(owner.phone ?? owner.name)}`}
            className="inline-flex h-11 items-center rounded-full bg-coral px-5 text-sm font-medium text-white"
          >
            เปิดเคสที่เคาน์เตอร์
          </Link>
        </PageHeader>

        <section className="grid gap-3 sm:grid-cols-2">
          {owner.pets.length === 0 ? (
            <EmptyState title="ยังไม่มีสัตว์ในทะเบียน" />
          ) : (
            owner.pets.map((p) => (
              <Link key={p.id} href={`/${branch}/pets/${p.id}`} className="clinic-card p-5">
                <p className="text-xs text-stone-400">{p.code}</p>
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p className="text-sm text-stone-500">
                  {p.speciesNameTh} · น้ำหนัก {p.currentWeightKg ?? "—"} กก.
                </p>
                {p.alerts.length > 0 ? (
                  <p className="mt-2 text-sm text-rose-700">{p.alerts.map((a) => a.label).join(" · ")}</p>
                ) : null}
              </Link>
            ))
          )}
        </section>

        <section className="clinic-card p-5">
          <h2 className="font-semibold">ใบเสร็จล่าสุด</h2>
          {owner.invoices.length === 0 ? (
            <p className="mt-2 text-sm text-stone-400">ยังไม่มีใบเสร็จ</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {owner.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <Link href={`/${branch}/pos?invoice=${i.id}`} className="hover:underline">
                    {i.number}
                    <span className="ml-2 text-stone-400">{formatThaiDateTime(new Date(i.issuedAt))}</span>
                  </Link>
                  <span className="flex items-center gap-2">
                    <StatusBadge value={i.status} map={INVOICE_STATUS} />
                    <span className="tabular-nums">{formatSatangTh(i.grandTotalSatang)} บาท</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof BusinessError) notFound();
    throw err;
  }
}
