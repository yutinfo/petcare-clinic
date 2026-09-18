import { ClinicMark } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <main className="paw-dot mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
      <section className="hidden lg:block">
        <ClinicMark className="origin-left scale-125" />
        <h1 className="mt-8 text-4xl font-semibold leading-tight">
          โรงพยาบาลสัตว์ที่
          <span className="text-coral"> สดใส</span>
          <br />
          และ<span className="text-teal"> เป็นระเบียบ</span>
        </h1>
        <p className="mt-4 max-w-md text-stone-500">
          รับเคส เวชระเบียน จ่ายยา คลัง ของหน้าร้าน และใบกำกับภาษีไทย ในที่เดียว
        </p>
        <ul className="mt-8 grid gap-3 text-sm">
          {[
            { t: "เคาน์เตอร์รับสัตว์", d: "ค้นจากเบอร์หรือชื่อแล้วเปิดเคสทันที" },
            { t: "ห้องตรวจ SOAP", d: "ลงนามแล้วแก้ไม่ได้ ใช้บันทึกเพิ่มเท่านั้น" },
            { t: "ยา FEFO + บิลไทย", d: "ตัดสต็อก คิดเงิน ออกใบเสร็จในจังหวะเดียว" },
          ].map((item) => (
            <li key={item.t} className="clinic-card p-4">
              <p className="font-medium text-ink">{item.t}</p>
              <p className="text-stone-500">{item.d}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="clinic-card p-8">
        <div className="lg:hidden">
          <ClinicMark />
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide text-teal">พนักงานคลินิก</p>
        <h2 className="mt-1 text-2xl font-semibold">เข้าสู่ระบบ</h2>
        <p className="mt-2 text-sm text-stone-500">ใช้อีเมลที่คลินิกออกให้</p>
        <div className="mt-6">
          <LoginForm from={from} />
        </div>
      </section>
    </main>
  );
}
