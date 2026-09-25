import { getTranslations } from "next-intl/server";
import { ClinicMark } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/staff/locale-switch";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const t = await getTranslations("login");
  const cards = [
    { title: t("cardReception"), hint: t("cardReceptionHint") },
    { title: t("cardSoap"), hint: t("cardSoapHint") },
    { title: t("cardBill"), hint: t("cardBillHint") },
  ];
  return (
    <main className="paw-dot mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
      <section className="hidden lg:block">
        <ClinicMark className="origin-left scale-125" />
        <h1 className="mt-8 text-4xl font-semibold leading-tight">
          {t("headlineBefore")}
          <span className="text-coral"> {t("headlineBright")}</span>
          <br />
          {t("headlineAnd")}
          <span className="text-teal"> {t("headlineOrderly")}</span>
        </h1>
        <p className="mt-4 max-w-md text-stone-500">{t("lead")}</p>
        <ul className="mt-8 grid gap-3 text-sm">
          {cards.map((item) => (
            <li key={item.title} className="clinic-card p-4">
              <p className="font-medium text-ink">{item.title}</p>
              <p className="text-stone-500">{item.hint}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="clinic-card p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="lg:hidden">
            <ClinicMark />
          </div>
          <LocaleSwitch />
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide text-teal">{t("eyebrow")}</p>
        <h2 className="mt-1 text-2xl font-semibold">{t("title")}</h2>
        <p className="mt-2 text-sm text-stone-500">{t("hint")}</p>
        <div className="mt-6">
          <LoginForm from={from} />
        </div>
      </section>
    </main>
  );
}
