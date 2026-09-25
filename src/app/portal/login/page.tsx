import { getTranslations } from "next-intl/server";
import { ClinicMark } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/staff/locale-switch";
import { PortalLoginForm } from "./portal-login-form";

export default async function PortalLoginPage() {
  const t = await getTranslations("portal");
  return (
    <main className="paw-dot mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="clinic-card p-8">
        <div className="flex items-center justify-between gap-3">
          <ClinicMark />
          <LocaleSwitch />
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide text-coral">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-semibold">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-stone-500">{t("loginHint")}</p>
        <div className="mt-6">
          <PortalLoginForm />
        </div>
      </div>
    </main>
  );
}
