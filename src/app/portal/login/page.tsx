import { ClinicMark } from "@/components/brand/logo";
import { PortalLoginForm } from "./portal-login-form";

export default function PortalLoginPage() {
  return (
    <main className="paw-dot mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="clinic-card p-8">
        <ClinicMark />
        <p className="mt-4 text-sm font-medium tracking-wide text-coral">พอร์ทัลเจ้าของสัตว์</p>
        <h1 className="mt-1 text-2xl font-semibold">เข้าสู่ระบบด้วยเบอร์โทร</h1>
        <p className="mt-2 text-sm text-stone-500">ขอรหัสครั้งเดียว แล้วกรอกเลข 6 หลักที่ได้รับ</p>
        <div className="mt-6">
          <PortalLoginForm />
        </div>
      </div>
    </main>
  );
}
