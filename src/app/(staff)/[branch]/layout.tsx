import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StaffShell } from "@/components/staff/staff-shell";
import { auth, signOut } from "@/server/auth/config";

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branch: string }>;
}) {
  const { branch } = await params;
  const session = await auth();
  if (!session?.user || session.user.kind !== "staff") {
    redirect("/login");
  }
  const t = await getTranslations("common");
  const branchName =
    session.user.branches.find((b) => b.code.toLowerCase() === branch.toLowerCase())?.name ??
    t("branchFallback");

  return (
    <StaffShell
      branch={branch}
      tenantName={session.user.tenantName ?? t("clinicFallback")}
      branchName={branchName}
      displayName={session.user.displayName}
      signOut={
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            className="text-sm text-stone-500 underline-offset-2 hover:text-ink hover:underline"
            type="submit"
          >
            {t("signOut")}
          </button>
        </form>
      }
    >
      {children}
    </StaffShell>
  );
}
