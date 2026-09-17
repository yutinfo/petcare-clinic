import Link from "next/link";
import { redirect } from "next/navigation";
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

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-teal-800">
              {session.user.tenantName ?? "PetCare Cloud"}
            </p>
            <Link href={`/${branch}/reception`} className="text-lg font-semibold">
              เคาน์เตอร์รับสัตว์
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-stone-600">{session.user.displayName}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-stone-500 underline" type="submit">
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-5">{children}</div>
    </div>
  );
}
