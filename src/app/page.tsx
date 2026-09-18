import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicMark } from "@/components/brand/logo";
import { toBuddhistYear } from "@/modules/shared";
import { auth } from "@/server/auth/config";
import { getPublicTenantName } from "@/server/public-tenant";

const ENTRANCES = [
  {
    href: "/login",
    eyebrow: "สำหรับพนักงานคลินิก",
    title: "เข้าสู่ระบบคลินิก",
    detail: "เปิดเคส walk-in, เวชระเบียน, จ่ายยา, คลัง, คิดเงินและออกใบกำกับภาษี",
    cta: "เข้าสู่ระบบด้วยอีเมล",
    accent: "text-teal",
    ring: "hover:border-teal/40",
    badge: "bg-teal/10 text-teal",
  },
  {
    href: "/portal/login",
    eyebrow: "สำหรับเจ้าของสัตว์เลี้ยง",
    title: "พอร์ทัลลูกค้า",
    detail: "จองคิว ดูประวัติการรักษา ใบเสร็จ และติดตามสัตว์ที่ฝากเลี้ยง",
    cta: "เข้าสู่ระบบด้วยเบอร์โทร",
    accent: "text-coral",
    ring: "hover:border-coral/40",
    badge: "bg-coral/10 text-coral",
  },
] as const;

export default async function HomePage() {
  const session = await auth();
  if (session?.user.kind === "staff" && session.user.defaultBranchCode) {
    redirect(`/${session.user.defaultBranchCode}`);
  }
  if (session?.user.kind === "owner") {
    redirect("/portal");
  }

  const clinicName = await getPublicTenantName();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <ClinicMark />
        {clinicName ? (
          <p className="text-right text-sm text-stone-500">{clinicName}</p>
        ) : null}
      </header>

      <section className="paw-dot mt-14 sm:mt-20">
        <p className="text-sm font-medium tracking-wide text-teal">ระบบคลินิกสัตว์เลี้ยง</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          {clinicName ?? "PetCare Cloud"}
        </h1>
        <p className="mt-4 max-w-xl text-stone-500">
          เลือกทางเข้าให้ตรงกับคุณ — พนักงานของคลินิก หรือเจ้าของสัตว์เลี้ยง
        </p>
      </section>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {ENTRANCES.map((entrance) => (
          <Link
            key={entrance.href}
            href={entrance.href}
            className={`clinic-card flex flex-col p-7 transition ${entrance.ring}`}
          >
            <span
              className={`self-start rounded-full px-3 py-1 text-xs font-medium ${entrance.badge}`}
            >
              {entrance.eyebrow}
            </span>
            <h2 className="mt-4 text-2xl font-semibold">{entrance.title}</h2>
            <p className="mt-2 grow text-sm leading-relaxed text-stone-500">{entrance.detail}</p>
            <span className={`mt-6 text-sm font-medium ${entrance.accent}`}>
              {entrance.cta} →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-stone-500">
        เจ้าของสัตว์ที่ยังเข้าไม่ได้ — แจ้งเคาน์เตอร์คลินิกให้ผูกเบอร์โทรของคุณก่อน
        แล้วขอรหัสครั้งเดียวได้จากหน้าพอร์ทัล
      </p>

      <ul className="mt-12 grid gap-3 text-sm text-stone-500 sm:grid-cols-3">
        <li className="clinic-card p-4">เปิดเคส walk-in จากเบอร์โทรหรือชื่อได้ในหน้าจอเดียว</li>
        <li className="clinic-card p-4">จ่ายยาแบบ FEFO ตัดสต็อกและตั้งค่าใช้จ่ายในจังหวะเดียวกัน</li>
        <li className="clinic-card p-4">ออกใบเสร็จและใบกำกับภาษีตามรูปแบบของไทย</li>
      </ul>

      <footer className="mt-auto pt-12 text-xs text-stone-400">
        © {toBuddhistYear(new Date())} {clinicName ?? "PetCare Cloud"} · ขับเคลื่อนด้วย PetCare Cloud
      </footer>
    </main>
  );
}
