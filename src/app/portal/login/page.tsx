import { PortalLoginForm } from "./portal-login-form";

export default function PortalLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium tracking-wide text-teal-800">พอร์ทัลเจ้าของสัตว์</p>
        <h1 className="mt-1 text-2xl font-semibold">เข้าสู่ระบบด้วยเบอร์โทร</h1>
        <p className="mt-2 text-sm text-stone-500">คลินิกตัวอย่าง: 0812345678 แล้วกดขอรหัส</p>
        <div className="mt-6">
          <PortalLoginForm />
        </div>
      </div>
    </main>
  );
}
