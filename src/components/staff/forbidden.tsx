import Link from "next/link";

export function ForbiddenScreen({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="clinic-card max-w-lg p-8">
      <p className="text-sm font-medium text-coral">ยังไม่มีสิทธิ์ในหน้านี้</p>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-stone-500">{hint}</p>
      <p className="mt-4 text-sm text-stone-500">
        ออกจากระบบแล้วเข้าด้วยบัญชีที่มีสิทธิ์ หรือกลับไปหน้าหลักของสาขา
      </p>
      <Link href="/" className="mt-4 inline-flex text-sm text-teal hover:underline">
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
