export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <p className="text-sm text-neutral-500">PetCare Cloud</p>
      <h1 className="text-3xl font-semibold tracking-tight">ระบบคลินิกสัตว์เลี้ยง</h1>
      <p className="text-neutral-600">
        เฟส 0 — กำลังวางรากฐาน (ฐานข้อมูล, สิทธิ์, ความปลอดภัยข้ามคลินิก)
        ยังไม่เปิดให้เจ้าหน้าที่ใช้งานจริง
      </p>
    </main>
  );
}
