"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}: {
  branch: string;
  species: SpeciesOption[];
  initialWaiting: Waiting[];
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OwnerSearchHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<{ owner: OwnerSearchHit; pet: PetSearchHit } | null>(
    null,
  );
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
          setMessage(res.hits.length === 0 ? "ไม่พบลูกค้า — สร้างใหม่ได้ด้านล่าง" : null);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [branch, query]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">ค้นหาแล้วเปิดเคส</h1>
          <p className="text-sm text-stone-500">พิมพ์เบอร์โทร ชื่อเจ้าของ ชื่อสัตว์ หรือรหัส</p>
        </div>
        <Input
          ref={searchBox}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="เช่น 0812345678 หรือ ข้าวปุ้น"
          className="h-14 text-lg"
        />
        {message ? <p className="text-sm text-stone-600">{message}</p> : null}

        <div className="space-y-3">
          {hits.map((owner) => (
            <article key={owner.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  {owner.displayName}{" "}
                  <span className="font-normal text-stone-400">{owner.code}</span>
                </h2>
                <p className="text-sm text-stone-500">{owner.phone ?? "ไม่มีเบอร์"}</p>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {owner.pets.map((pet) => (
                  <li key={pet.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected({ owner, pet });
                        setCreating(false);
                      }}
                      className="flex min-h-14 w-full flex-col items-start rounded-lg border border-stone-200 px-3 py-2 text-left hover:border-teal-700 hover:bg-teal-50"
                    >
                      <span className="font-medium">
                        {pet.name}{" "}
                        <span className="font-normal text-stone-400">{pet.speciesNameTh}</span>
                      </span>
                      <span className="text-xs text-stone-500">{pet.code}</span>
                      {pet.alerts.length > 0 ? (
                        <span className="mt-1 text-xs font-medium text-red-700">
                          ⚠ {pet.alerts.map((a) => a.label).join(" · ")}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-stone-300 bg-white/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">ลูกค้าใหม่</h2>
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
          ) : (
            <p className="mt-2 text-sm text-stone-500">กรอก 4 ช่อง: ชื่อเจ้าของ เบอร์ ชื่อสัตว์ ชนิด</p>
          )}
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
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">
            ยังไม่มีเคสรอตรวจ
          </p>
        ) : (
          <ul className="space-y-2">
            {initialWaiting.map((enc) => (
              <li key={enc.id} className="rounded-xl border border-stone-200 bg-white p-3">
                <a href={`/${branch}/encounters/${enc.id}`} className="block">
                  <p className="text-xs text-stone-400">{enc.number}</p>
                  <p className="font-medium">
                    {enc.petName} · {enc.ownerName}
                  </p>
                  <p className="text-xs text-stone-500">
                    {enc.status === "WAITING" ? "รอตรวจ" : "กำลังตรวจ"}
                    {enc.chiefComplaint ? ` · ${enc.chiefComplaint}` : ""}
                  </p>
                </a>
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
      className="mt-3 grid gap-3 sm:grid-cols-2"
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
      <label className="space-y-1 text-sm">
        <span>ชื่อเจ้าของ</span>
        <Input name="ownerFirstName" required />
      </label>
      <label className="space-y-1 text-sm">
        <span>เบอร์โทร</span>
        <Input name="phone" inputMode="tel" required />
      </label>
      <label className="space-y-1 text-sm">
        <span>ชื่อสัตว์</span>
        <Input name="petName" required />
      </label>
      <label className="space-y-1 text-sm">
        <span>ชนิดสัตว์</span>
        <select
          name="speciesId"
          defaultValue={defaultSpecies}
          className="h-12 w-full rounded-lg border border-stone-300 bg-white px-3"
        >
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameTh}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" className="h-12 bg-teal-800 hover:bg-teal-700" disabled={pending}>
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
      className="space-y-3 rounded-xl border-2 border-teal-800 bg-white p-4"
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
        </div>
        <button type="button" className="text-sm text-stone-500 underline" onClick={onCancel}>
          ยกเลิก
        </button>
      </div>
      {highAlerts.length > 0 ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          ⚠ {highAlerts.map((a) => a.label).join(" · ")}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>น้ำหนัก (กก.)</span>
          <Input
            name="weightKg"
            inputMode="decimal"
            placeholder={selected.pet.currentWeightKg ?? "เช่น 5.2"}
            autoFocus
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>ประเภทเคส</span>
          <select name="type" defaultValue="OPD" className="h-12 w-full rounded-lg border border-stone-300 bg-white px-3">
            <option value="OPD">ตรวจทั่วไป</option>
            <option value="VACCINE">วัคซีน</option>
            <option value="RECHECK">ตรวจซ้ำ</option>
            <option value="EMERGENCY">ฉุกเฉิน</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>อาการเบื้องต้น</span>
        <Input name="chiefComplaint" placeholder="เช่น อาเจียน 1 วัน" />
      </label>
      <Button type="submit" className="h-12 w-full bg-teal-800 hover:bg-teal-700" disabled={pending}>
        {pending ? "กำลังเปิดเคส…" : "เปิดเคส"}
      </Button>
    </form>
  );
}
