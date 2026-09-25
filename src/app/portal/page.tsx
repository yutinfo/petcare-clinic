import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ClinicMark } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/staff/locale-switch";
import { EmptyState, StatusBadge } from "@/components/staff/ui";
import { formatSatang, formatWhen } from "@/lib/i18n/format";
import { resolveLocale } from "@/lib/i18n/locale";
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
    const t = await getTranslations("portal");
    const bookingStatus = await getTranslations("enum.BookingStatus");
    const bookingType = await getTranslations("enum.BookingType");
    const care = await getTranslations("enum.CareLog");
    const invoiceStatus = await getTranslations("enum.InvoiceStatus");
    const locale = resolveLocale(await getLocale());
    const when = (iso: string) => formatWhen(new Date(iso), locale);
    return (
      <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-8">
        <header className="flex items-center justify-between gap-3">
          <ClinicMark />
          <div className="flex items-center gap-3">
            <LocaleSwitch />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/portal/login" });
            }}
          >
            <button className="text-sm text-stone-500 hover:underline" type="submit">
              {t("signOut")}
            </button>
          </form>
          </div>
        </header>
        <div>
          <p className="text-sm font-medium text-coral">{t("eyebrow")}</p>
          <h1 className="text-3xl font-semibold">{home.ownerName ? t("hello", { name: home.ownerName }) : t("helloPlain")}</h1>
          <p className="mt-1 text-sm text-stone-500">{t("lead")}</p>
        </div>
        <section className="grid gap-3 sm:grid-cols-2">
          {home.pets.length === 0 ? (
            <EmptyState title={t("noPets")} hint={t("noPetsHint")} />
          ) : (
            home.pets.map((p) => (
              <article key={p.id} className="clinic-card p-5">
                <p className="text-xs text-stone-400">{p.speciesNameTh}</p>
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p className="text-sm text-stone-500">{t("weight", { kg: p.currentWeightKg ?? "—" })}</p>
                {p.nextVaccine ? (
                  <p className="mt-2 text-sm text-teal">{t("nextVaccine", { when: when(p.nextVaccine) })}</p>
                ) : null}
              </article>
            ))
          )}
        </section>
        {home.stays.length > 0 ? (
          <section className="clinic-card p-5">
            <h2 className="font-semibold">{t("staying")}</h2>
            {home.stays.map((s) => (
              <div key={s.id} className="mt-3">
                <p>
                  {t("pickup", { pet: s.petName, when: when(s.expectedOutAt) })}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-stone-500">
                  {s.logs.length === 0 ? <li>{t("noCare")}</li> : null}
                  {s.logs.map((l) => (
                    <li key={l.occurredAt}>
                      {when(l.occurredAt)} · {care(l.type as "FEED")}
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
          <h2 className="font-semibold">{t("upcoming")}</h2>
          {home.bookings.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">{t("noBookings")}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {home.bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {when(b.startAt)} · {b.petName}
                  </span>
                  <span className="flex gap-2">
                    <StatusBadge value={b.type} map={{
                      CONSULT: bookingType("CONSULT"),
                      VACCINE: bookingType("VACCINE"),
                      GROOMING: bookingType("GROOMING"),
                      FOLLOW_UP: bookingType("FOLLOW_UP"),
                      BOARDING: bookingType("BOARDING"),
                      SURGERY: bookingType("SURGERY"),
                      OTHER: bookingType("OTHER"),
                    }} />
                    <StatusBadge value={b.status} map={{
                      REQUESTED: bookingStatus("REQUESTED"),
                      CONFIRMED: bookingStatus("CONFIRMED"),
                      CHECKED_IN: bookingStatus("CHECKED_IN"),
                      COMPLETED: bookingStatus("COMPLETED"),
                      CANCELLED: bookingStatus("CANCELLED"),
                      NO_SHOW: bookingStatus("NO_SHOW"),
                    }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="clinic-card p-5">
          <h2 className="font-semibold">{t("receipts")}</h2>
          {home.invoices.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">{t("noReceipts")}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {home.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <span>
                    {i.number}
                    <StatusBadge value={i.status} map={{
                      DRAFT: invoiceStatus("DRAFT"),
                      ISSUED: invoiceStatus("ISSUED"),
                      PARTIALLY_PAID: invoiceStatus("PARTIALLY_PAID"),
                      PAID: invoiceStatus("PAID"),
                      VOID: invoiceStatus("VOID"),
                    }} className="ml-2" />
                  </span>
                  <span className="tabular-nums">{t("baht", { amount: formatSatang(i.grandTotalSatang, locale) })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <Link href="/login" className="text-sm text-teal hover:underline">
          {t("staffEntry")}
        </Link>
      </main>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/portal/login");
    throw err;
  }
}
