"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/staff/ui";
import { Input } from "@/components/ui/input";
import type { OwnerSearchHit } from "@/modules/crm";

export function ClientSearch({
  branch,
  initialQuery,
  hits,
}: {
  branch: string;
  initialQuery: string;
  hits: OwnerSearchHit[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const t = setTimeout(() => {
      const url =
        query.trim().length >= 2
          ? `/${branch}/clients?q=${encodeURIComponent(query.trim())}`
          : `/${branch}/clients`;
      router.replace(url);
    }, 220);
    return () => clearTimeout(t);
  }, [branch, query, router]);

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ค้นชื่อ เบอร์ หรือรหัส"
        className="h-14 text-lg"
        autoFocus
      />
      {query.trim().length < 2 ? (
        <EmptyState title="พิมพ์อย่างน้อย 2 ตัวอักษร" hint="ลองเบอร์โทร ชื่อเจ้าของ หรือชื่อสัตว์ เช่น ข้าวปุ้น" />
      ) : hits.length === 0 ? (
        <EmptyState title="ไม่พบลูกค้า" hint="ไปเคาน์เตอร์รับสัตว์เพื่อสร้างลูกค้าใหม่ได้ในหน้าเดียว">
          <Link
            href={`/${branch}/reception`}
            className="inline-flex h-11 items-center rounded-full bg-coral px-5 text-sm font-medium text-white"
          >
            สร้างลูกค้าใหม่
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {hits.map((owner) => (
            <article key={owner.id} className="clinic-card p-5">
              <Link href={`/${branch}/clients/${owner.id}`} className="hover:underline">
                <h2 className="font-semibold">
                  {owner.displayName} <span className="text-sm font-normal text-stone-400">{owner.code}</span>
                </h2>
              </Link>
              <p className="text-sm text-stone-500">{owner.phone ?? "ไม่มีเบอร์"}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {owner.pets.map((pet) => (
                  <li key={pet.id}>
                    <Link
                      href={`/${branch}/pets/${pet.id}`}
                      className="inline-flex min-h-9 items-center rounded-full bg-cream px-3 py-1 text-sm hover:bg-sand"
                    >
                      {pet.name} · {pet.speciesNameTh}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
