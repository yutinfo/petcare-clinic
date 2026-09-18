import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicMark } from "@/components/brand/logo";
import { BOOKING_STATUS, BOOKING_TYPE, CARE_LOG, INVOICE_STATUS, labelOf } from "@/components/staff/labels";
import { EmptyState, StatusBadge } from "@/components/staff/ui";
import { formatSatangTh } from "@/modules/shared/money";
import { formatThaiDateTime } from "@/modules/shared/date";
import { listPortalHome } from "@/modules/crm";
import { UnauthenticatedError } from "@/modules/shared";
import { auth, signOut } from "@/server/auth/config";
import { getOwnerContext } from "@/server/owner-context";
import { PortalBookingForm } from "./booking-form";

export default async function PortalHomePage() {
  const session = await auth();
  if (!session?.user || session.user.kind !== "owner") {
    redirect("/portal/login");
  }
  try {
    const ctx = await getOwnerContext();
    const home = await listPortalHome(ctx);
    return (
      <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-8">
        <header className="flex items-center justify-between">
          <ClinicMark />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/portal/login" });
            }}
          >
            <button className="text-sm text-stone-500 hover:underline" type="submit">
              ออกจากระบบ
            </button>
          </form>
        </header>
        <div>
          <p className="text-sm font-medium text-coral">พอร์ทัลเจ้าของสัตว์</p>
          <h1 className="text-3xl font-semibold">สวัสดีคุณ {home.ownerName}</h1>
          <p className="mt-1 text-sm text-stone-500">ดูสัตว์ของฉัน จองคิว ติดตามฝากเลี้ยง และใบเสร็จ</p>
        </div>
        <section className="grid gap-3 sm:grid-cols-2">
          {home.pets.length === 0 ? (
            <EmptyState title="ยังไม่มีสัตว์ในทะเบียน" hint="แจ้งเคาน์เตอร์คลินิกให้ออกบัตรให้" />
          ) : (
            home.pets.map((p) => (
              <article key={p.id} className="clinic-card p-5">
                <p className="text-xs text-stone-400">{p.speciesNameTh}</p>
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p className="text-sm text-stone-500">น้ำหนัก {p.currentWeightKg ?? "—"} กก.</p>
                {p.nextVaccine ? (
                  <p className="mt-2 text-sm text-teal">วัคซีนครั้งถัดไป {formatThaiDateTime(new Date(p.nextVaccine))}</p>
                ) : null}
              </article>
            ))
          )}
        </section>
        {home.stays.length > 0 ? (
          <section className="clinic-card p-5">
            <h2 className="font-semibold">สัตว์ที่ฝากเลี้ยงอยู่</h2>
            {home.stays.map((s) => (
              <div key={s.id} className="mt-3">
                <p>
                  {s.petName} · กำหนดรับ {formatThaiDateTime(new Date(s.expectedOutAt))}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-stone-500">
                  {s.logs.length === 0 ? <li>ยังไม่มีบันทึกดูแลวันนี้</li> : null}
                  {s.logs.map((l) => (
                    <li key={l.occurredAt}>
                      {formatThaiDateTime(new Date(l.occurredAt))} · {labelOf(CARE_LOG, l.type)}
                      {l.detail ? ` ${l.detail}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}
        <PortalBookingForm pets={home.pets} />
        <section className="clinic-card p-5">
          <h2 className="font-semibold">นัดที่กำลังมา</h2>
          {home.bookings.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">ยังไม่มีนัด — จองด้านบนได้เลย</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {home.bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {formatThaiDateTime(new Date(b.startAt))} · {b.petName}
                  </span>
                  <span className="flex gap-2">
                    <StatusBadge value={b.type} map={BOOKING_TYPE} />
                    <StatusBadge value={b.status} map={BOOKING_STATUS} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="clinic-card p-5">
          <h2 className="font-semibold">ใบเสร็จ</h2>
          {home.invoices.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">ยังไม่มีใบเสร็จ</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {home.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <span>
                    {i.number}
                    <StatusBadge value={i.status} map={INVOICE_STATUS} className="ml-2" />
                  </span>
                  <span className="tabular-nums">{formatSatangTh(i.grandTotalSatang)} บาท</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <Link href="/login" className="text-sm text-teal hover:underline">
          พนักงานคลินิก
        </Link>
      </main>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/portal/login");
    throw err;
  }
}
