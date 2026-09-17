import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth/config";

export default async function PortalHomePage() {
  const session = await auth();
  if (!session?.user || session.user.kind !== "owner") {
    redirect("/portal/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-teal-800">พอร์ทัลเจ้าของสัตว์</p>
          <h1 className="text-2xl font-semibold">สวัสดีคุณ {session.user.displayName}</h1>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/portal/login" });
          }}
        >
          <button className="text-sm text-stone-500 underline" type="submit">
            ออกจากระบบ
          </button>
        </form>
      </header>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-600">
        ดูประวัติสัตว์ จองคิว และใบเสร็จจะเปิดในเฟสพอร์ทัล — ตอนนี้เข้าสู่ระบบได้แล้ว
      </div>
      <Link href="/login" className="text-sm text-teal-800 underline">
        ไปหน้าพนักงาน
      </Link>
    </main>
  );
}
