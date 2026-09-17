import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium tracking-wide text-teal-800">PetCare Cloud</p>
        <h1 className="mt-1 text-2xl font-semibold">เข้าสู่ระบบพนักงาน</h1>
        <p className="mt-2 text-sm text-stone-500">คลินิกตัวอย่าง: nune@demo.local / demo1234</p>
        <div className="mt-6">
          <LoginForm from={from} />
        </div>
      </div>
    </main>
  );
}
