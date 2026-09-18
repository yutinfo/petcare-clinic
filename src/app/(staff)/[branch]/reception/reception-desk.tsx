"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ENCOUNTER_STATUS, ENCOUNTER_TYPE } from "@/components/staff/labels";
import { WaitMinutes } from "@/components/staff/live";
import { AlertChip, EmptyState, Field, Notice, PageHeader, StatusBadge } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { OwnerSearchHit, PetSearchHit, SpeciesOption } from "@/modules/crm";
import { checkInAction, createCustomerAction, searchAction } from "../actions";

type Waiting = {
  id: string;
  number: string;
  status: string;
  arrivedAt: string;
  chiefComplaint: string | null;
  petName: string;
  petCode: string;
  speciesNameTh: string;
  ownerName: string;
  alerts: { type: string; severity: string; label: string }[];
};

export function ReceptionDesk({
  branch,
  species,
  initialWaiting,
  initialQuery,
}: {
  branch: string;
  species: SpeciesOption[];
  initialWaiting: Waiting[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<OwnerSearchHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<{ owner: OwnerSearchHit; pet: PetSearchHit } | null>(null);
  const [pending, start] = useTransition();
  const searchBox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchBox.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      start(async () => {
        const res = await searchAction(branch, query);
        if (!res.ok) setMessage(res.message);
        else {
          setHits(res.hits);
          setMessage(res.hits.length === 0 ? "ไม่พบลูกค้า — สร้างใหม่ด้านล่างได้เลย" : null);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [branch, query]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="space-y-4">
        <PageHeader
          eyebrow="เคาน์เตอร์รับสัตว์"
          title="ค้นหาแล้วเปิดเคส"
          description="พิมพ์เบอร์โทร ชื่อเจ้าของ ชื่อสัตว์ หรือรหัส — เลือกตัวสัตว์ ชั่งน้ำหนัก แล้วเปิดเคส"
        />
        <Input
          ref={searchBox}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="เช่น 0812345678 หรือ ข้าวปุ้น"
          className="h-14 text-lg"
        />
        {message ? <Notice tone={hits.length === 0 ? "warn" : "error"}>{message}</Notice> : null}

        {query.trim().length < 2 && !selected ? (
          <EmptyState title="เริ่มจากช่องค้นหาด้านบน" hint="พิมพ์อย่างน้อย 2 ตัวอักษร หรือสร้างลูกค้าใหม่ถ้ามาครั้งแรก" />
        ) : null}

        <div className="space-y-3">
          {hits.map((owner) => (
            <article key={owner.id} className="clinic-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  <Link href={`/${branch}/clients/${owner.id}`} className="hover:underline">
                    {owner.displayName}
                  </Link>{" "}
                  <span className="font-normal text-stone-400">{owner.code}</span>
                </h2>
                <p className="text-sm text-stone-500">{owner.phone ?? "ไม่มีเบอร์"}</p>
              </div>
              {owner.pets.length === 0 ? (
                <p className="mt-3 text-sm text-stone-400">ยังไม่มีสัตว์ในทะเบียน — สร้างลูกค้าใหม่ไม่ได้ ต้องเพิ่มสัตว์</p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {owner.pets.map((pet) => {
                    const on = selected?.pet.id === pet.id;
                    return (
                      <li key={pet.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected({ owner, pet });
                            setCreating(false);
                          }}
                          className={`flex min-h-14 w-full flex-col items-start rounded-xl border px-3 py-2 text-left ${
                            on ? "border-coral bg-orange-50" : "border-stone-200 hover:border-coral hover:bg-orange-50"
                          }`}
                        >
                          <span className="font-medium">
                            {pet.name}{" "}
                            <span className="font-normal text-stone-400">{pet.speciesNameTh}</span>
                          </span>
                          <span className="text-xs text-stone-500">{pet.code}</span>
                          {pet.alerts.length > 0 ? (
                            <span className="mt-1 text-xs font-medium text-rose-700">
                              {pet.alerts.map((a) => a.label).join(" · ")}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          ))}
        </div>

        <div className="clinic-card border-dashed p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">ลูกค้าใหม่</h2>
              <p className="text-sm text-stone-500">กรอก 4 ช่อง แล้วไปชั่งน้ำหนักต่อ</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setCreating((v) => !v)}>
              {creating ? "ปิดฟอร์ม" : "สร้างลูกค้าใหม่"}
            </Button>
          </div>
          {creating ? (
            <NewCustomerForm
              branch={branch}
              species={species}
              pending={pending}
              onCreated={(owner, pet) => {
                setSelected({ owner, pet });
                setCreating(false);
                setQuery(owner.phone ?? pet.name);
              }}
              onError={setMessage}
              start={start}
            />
          ) : null}
        </div>

        {selected ? (
          <CheckInPanel
            branch={branch}
            selected={selected}
            pending={pending}
            start={start}
            onError={setMessage}
            onCancel={() => setSelected(null)}
          />
        ) : null}
      </section>

      <aside className="space-y-3">
        <h2 className="font-semibold">คิววันนี้</h2>
        {initialWaiting.length === 0 ? (
          <EmptyState title="ยังไม่มีเคสรอตรวจ" hint="เมื่อเปิดเคส จะโชว์ที่นี่และบนกระดานคิว" />
        ) : (
          <ul className="space-y-2">
            {initialWaiting.map((enc) => (
                <li key={enc.id}>
                  <Link href={`/${branch}/encounters/${enc.id}`} className="clinic-card block p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-stone-400">{enc.number}</p>
                      <StatusBadge value={enc.status} map={ENCOUNTER_STATUS} />
                    </div>
                    <p className="mt-1 font-medium">
                      {enc.petName} · {enc.ownerName}
                    </p>
                    <p className="text-xs text-stone-500">
                      <WaitMinutes iso={enc.arrivedAt} />
                      {enc.chiefComplaint ? ` · ${enc.chiefComplaint}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function NewCustomerForm({
  branch,
  species,
  pending,
  onCreated,
  onError,
  start,
}: {
  branch: string;
  species: SpeciesOption[];
  pending: boolean;
  onCreated: (owner: OwnerSearchHit, pet: PetSearchHit) => void;
  onError: (msg: string) => void;
  start: (fn: () => Promise<void>) => void;
}) {
  const defaultSpecies = species[0]?.id ?? "";
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const res = await createCustomerAction(branch, {
            ownerFirstName: String(data.get("ownerFirstName") ?? ""),
            phone: String(data.get("phone") ?? ""),
            petName: String(data.get("petName") ?? ""),
            speciesId: String(data.get("speciesId") ?? ""),
          });
          if (!res.ok) onError(res.message);
          else {
            onCreated(
              {
                id: res.created.owner.id,
                code: res.created.owner.code,
                displayName: res.created.owner.displayName,
                phone: res.created.owner.phone,
                pets: [res.created.pet],
              },
              res.created.pet,
            );
          }
        });
      }}
    >
      <Field label="ชื่อเจ้าของ">
        <Input name="ownerFirstName" required autoComplete="name" />
      </Field>
      <Field label="เบอร์โทร">
        <Input name="phone" inputMode="tel" required autoComplete="tel" />
      </Field>
      <Field label="ชื่อสัตว์">
        <Input name="petName" required />
      </Field>
      <Field label="ชนิดสัตว์">
        <Select name="speciesId" defaultValue={defaultSpecies}>
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameTh}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" className="h-12 w-full" disabled={pending}>
          บันทึกลูกค้าแล้วไปชั่งน้ำหนัก
        </Button>
      </div>
    </form>
  );
}

function CheckInPanel({
  branch,
  selected,
  pending,
  start,
  onError,
  onCancel,
}: {
  branch: string;
  selected: { owner: OwnerSearchHit; pet: PetSearchHit };
  pending: boolean;
  start: (fn: () => Promise<void>) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const highAlerts = useMemo(
    () => selected.pet.alerts.filter((a) => a.severity === "HIGH" || a.type === "ALLERGY"),
    [selected.pet.alerts],
  );

  return (
    <form
      className="clinic-card space-y-3 border-2 border-coral p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const res = await checkInAction(branch, {
            petId: selected.pet.id,
            weightKg: String(data.get("weightKg") ?? ""),
            chiefComplaint: String(data.get("chiefComplaint") ?? ""),
            type: String(data.get("type") ?? "OPD") as "OPD" | "EMERGENCY" | "VACCINE" | "RECHECK",
          });
          if (res && !res.ok) onError(res.message);
        });
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-stone-400">กำลังเปิดเคส</p>
          <h2 className="text-xl font-semibold">
            {selected.pet.name} · {selected.owner.displayName}
          </h2>
          <p className="text-sm text-stone-500">
            {selected.pet.speciesNameTh} · {selected.pet.code}
          </p>
        </div>
        <button type="button" className="text-sm text-stone-500 underline" onClick={onCancel}>
          ยกเลิก
        </button>
      </div>
      <AlertChip labels={highAlerts.map((a) => a.label)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="น้ำหนัก (กก.)" hint="ใช้คำนวณขนาดยาในห้องตรวจ">
          <Input
            name="weightKg"
            inputMode="decimal"
            required
            defaultValue={selected.pet.currentWeightKg ?? ""}
            placeholder="เช่น 5.2"
            autoFocus
          />
        </Field>
        <Field label="ประเภทเคส">
          <Select name="type" defaultValue="OPD">
            {Object.entries(ENCOUNTER_TYPE)
              .filter(([k]) => ["OPD", "VACCINE", "RECHECK", "EMERGENCY"].includes(k))
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <Field label="อาการเบื้องต้น">
        <Input name="chiefComplaint" placeholder="เช่น อาเจียน 1 วัน" />
      </Field>
      <Button type="submit" className="h-12 w-full" variant="coral" disabled={pending}>
        {pending ? "กำลังเปิดเคส…" : "เปิดเคส"}
      </Button>
    </form>
  );
}
