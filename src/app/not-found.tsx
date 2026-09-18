import Link from "next/link";
import { ClinicMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <ClinicMark />
      <p className="mt-8 text-sm font-medium text-coral">ไม่พบหน้านี้</p>
      <h1 className="mt-1 text-3xl font-semibold">ลิงก์นี้ไม่มีในระบบ</h1>
      <p className="mt-2 text-sm text-stone-500">อาจปิดเคสไปแล้ว หรือพิมพ์ที่อยู่ผิด</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 w-fit items-center rounded-full bg-teal px-5 text-sm font-medium text-white"
      >
        กลับหน้าหลัก
      </Link>
    </main>
  );
}
