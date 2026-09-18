"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchAction } from "@/app/(staff)/[branch]/actions";
import { Input } from "@/components/ui/input";
import type { OwnerSearchHit, PetSearchHit } from "@/modules/crm";
import { EmptyState, Notice } from "./ui";

export function OwnerPetPicker({
  branch,
  mode,
  placeholder,
  selectedLabel,
  onPickOwner,
  onPickPet,
}: {
  branch: string;
  mode: "owner" | "pet";
  placeholder: string;
  selectedLabel?: string;
  onPickOwner?: (owner: OwnerSearchHit) => void;
  onPickPet?: (owner: OwnerSearchHit, pet: PetSearchHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OwnerSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      start(async () => {
        const res = await searchAction(branch, query);
        if (!res.ok) setError(res.message);
        else {
          setError(null);
          setHits(res.hits);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [branch, query]);

  return (
    <div className="space-y-2">
      <Input
        ref={box}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {selectedLabel ? <p className="text-sm font-medium text-teal">{selectedLabel}</p> : null}
      {error ? <Notice>{error}</Notice> : null}
      {query.trim().length >= 2 && !pending && hits.length === 0 && !error ? (
        <EmptyState title="ไม่พบลูกค้า" hint="ลองเบอร์โทร หรือสร้างใหม่ที่หน้า รับสัตว์" />
      ) : null}
      <ul className="space-y-2">
        {hits.map((owner) => (
          <li key={owner.id} className="clinic-card p-3">
            <button
              type="button"
              className="flex w-full items-baseline justify-between gap-2 rounded-xl text-left hover:bg-cream"
              onClick={() => {
                onPickOwner?.(owner);
                if (mode === "owner") {
                  setHits([]);
                  setQuery(owner.displayName);
                }
              }}
            >
              <span className="font-medium">
                {owner.displayName}{" "}
                <span className="font-normal text-stone-400">{owner.code}</span>
              </span>
              <span className="text-sm text-stone-500">{owner.phone ?? "ไม่มีเบอร์"}</span>
            </button>
            {mode === "pet" ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {owner.pets.length === 0 ? (
                  <li className="text-sm text-stone-400">ยังไม่มีสัตว์ในทะเบียน</li>
                ) : null}
                {owner.pets.map((pet) => (
                  <li key={pet.id}>
                    <button
                      type="button"
                      className="flex min-h-11 w-full flex-col items-start rounded-xl border border-stone-200 px-3 py-2 text-left hover:border-coral hover:bg-orange-50"
                      onClick={() => {
                        onPickPet?.(owner, pet);
                        setHits([]);
                        setQuery(`${pet.name} · ${owner.displayName}`);
                      }}
                    >
                      <span className="font-medium">
                        {pet.name}{" "}
                        <span className="font-normal text-stone-400">{pet.speciesNameTh}</span>
                      </span>
                      {pet.alerts.length > 0 ? (
                        <span className="text-xs font-medium text-rose-700">
                          {pet.alerts.map((a) => a.label).join(" · ")}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
