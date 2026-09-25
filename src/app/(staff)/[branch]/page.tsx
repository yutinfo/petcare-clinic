import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DEPARTMENT_SURFACE } from "@/components/staff/nav";
import { PageHeader } from "@/components/staff/ui";
import { ENCOUNTER_STATUS, waitMinutes } from "@/components/staff/labels";
import { WaitMinutes } from "@/components/staff/live";
import { listWaitingEncounters } from "@/modules/clinical";
import { UnauthenticatedError } from "@/modules/shared";
import { formatSatang } from "@/lib/i18n/format";
import { resolveLocale } from "@/lib/i18n/locale";
import { getBranchDashboard } from "@/modules/reporting";
import { auth } from "@/server/auth/config";
import { getStaffContext } from "@/server/staff-context";

export default async function BranchHomePage({
  params,
}: {
  params: Promise<{ branch: string }>;
}) {
  const { branch } = await params;
  try {
    const [ctx, session] = await Promise.all([getStaffContext(branch), auth()]);
    const [dash, waiting] = await Promise.all([getBranchDashboard(ctx), listWaitingEncounters(ctx)]);
    const t = await getTranslations("dashboard");
    const status = await getTranslations("enum.EncounterStatus");
    const locale = resolveLocale(await getLocale());
    const hour = new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Bangkok" });
    const period = Number(hour) < 12 ? "morning" : Number(hour) < 17 ? "afternoon" : "evening";
    const name = session?.user.displayName ?? "";
    const overdue = waiting.filter((w) => waitMinutes(w.arrivedAt) >= 20).length;

    const cards = [
      {
        href: `/${branch}/queue`,
        label: t("waiting"),
        value: String(dash.waiting),
        tone: "bg-amber-50 text-amber-900",
        hint: overdue > 0 ? t("overdue", { count: overdue }) : t("waitingHint"),
      },
      {
        href: `/${branch}/queue`,
        label: t("inProgress"),
        value: String(dash.inProgress),
        tone: "bg-sky-50 text-sky-900",
        hint: t("inProgressHint"),
      },
      {
        href: `/${branch}/pos`,
        label: t("readyToBill"),
        value: String(dash.readyToBill),
        tone: "bg-emerald-50 text-emerald-900",
        hint: t("readyToBillHint"),
      },
      {
        href: `/${branch}/pos`,
        label: t("revenue"),
        value: formatSatang(dash.todayRevenueSatang, locale),
        tone: "bg-teal-50 text-teal-950",
        hint: t("revenueHint"),
      },
      {
        href: `/${branch}/boarding`,
        label: t("boarding"),
        value: `${dash.boarding}/${dash.kennels}`,
        tone: DEPARTMENT_SURFACE.boarding,
        hint: t("boardingHint"),
      },
      {
        href: `/${branch}/grooming`,
        label: t("grooming"),
        value: String(dash.grooming),
        tone: DEPARTMENT_SURFACE.grooming,
        hint: t("groomingHint"),
      },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={name ? t(period, { name }) : t(`${period}Plain`)}
          description={t("description")}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className={`clinic-card p-5 ${c.tone}`}>
              <p className="text-sm opacity-80">{c.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</p>
              <p className="mt-1 text-sm">{c.hint}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{t("queueTitle")}</h2>
              <Link href={`/${branch}/queue`} className="text-sm text-teal hover:underline">
                {t("openQueue")}
              </Link>
            </div>
            {waiting.length === 0 ? (
              <div className="clinic-card p-6">
                <p className="font-medium">{t("emptyQueue")}</p>
                <p className="mt-1 text-sm text-stone-500">{t("emptyQueueHint")}</p>
                <Link
                  href={`/${branch}/reception`}
                  className="mt-4 inline-flex h-11 items-center rounded-full bg-coral px-5 text-sm font-medium text-white hover:bg-orange-600"
                >
                  {t("goReception")}
                </Link>
              </div>
            ) : (
              <ul className="grid gap-2">
                {waiting.map((enc) => (
                    <li key={enc.id}>
                      <Link href={`/${branch}/encounters/${enc.id}`} className="clinic-card flex items-center justify-between gap-3 p-4">
                        <div>
                          <p className="text-xs text-stone-400">{enc.number}</p>
                          <p className="font-medium">
                            {enc.petName}{" "}
                            <span className="font-normal text-stone-500">{enc.speciesNameTh}</span>
                          </p>
                          <p className="text-sm text-stone-500">
                            {enc.ownerName}
                            {enc.chiefComplaint ? ` · ${enc.chiefComplaint}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-stone-400">{status(enc.status as keyof typeof ENCOUNTER_STATUS)}</p>
                          <p className="text-sm font-medium text-stone-500">
                            <WaitMinutes iso={enc.arrivedAt} prefix="" />
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <aside className="space-y-3">
            <Link href={`/${branch}/reception`} className="clinic-card block p-5">
              <p className="text-sm font-medium text-coral">{t("mainWork")}</p>
              <h2 className="mt-1 text-xl font-semibold">{t("walkIn")}</h2>
              <p className="mt-2 text-sm text-stone-500">{t("walkInHint")}</p>
              <span className="mt-4 inline-flex h-11 items-center rounded-full bg-coral px-5 text-sm font-medium text-white">
                {t("goCounter")}
              </span>
            </Link>
            <Link href={`/${branch}/pos`} className="clinic-card block p-5">
              <p className="text-sm font-medium text-teal">{t("billingEyebrow")}</p>
              <h2 className="mt-1 text-xl font-semibold">{t("oneBill")}</h2>
              <p className="mt-2 text-sm text-stone-500">{t("oneBillHint")}</p>
              <span className="mt-4 inline-flex h-11 items-center rounded-full bg-teal px-5 text-sm font-medium text-white">
                {t("goPos")}
              </span>
            </Link>
          </aside>
        </div>
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
