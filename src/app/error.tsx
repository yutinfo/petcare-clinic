"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-coral">เกิดข้อผิดพลาด</p>
      <h1 className="mt-1 text-3xl font-semibold">ทำรายการไม่สำเร็จ</h1>
      <p className="mt-2 text-sm text-stone-500">ลองใหม่ได้เลย ถ้ายังไม่หายให้แจ้งผู้ดูแลระบบ</p>
      <Button type="button" className="mt-6 w-fit" onClick={() => reset()}>
        ลองใหม่
      </Button>
    </main>
  );
}
