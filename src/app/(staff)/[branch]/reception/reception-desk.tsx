"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("reception");
  const status = useTranslations("enum.EncounterStatus");
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
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
        {selected ? (
          <>
            {message ? <Notice>{message}</Notice> : null}
            <CheckInPanel
              branch={branch}
              selected={selected}
              pending={pending}
              start={start}
              onError={setMessage}
              onCancel={() => {
                setMessage(null);
                setSelected(null);
              }}
            />
          </>
        ) : (
          <>
        <Input
          ref={searchBox}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-14 text-lg"
          aria-label={t("searchLabel")}
        />
        {message ? <Notice tone={hits.length === 0 ? "warn" : "error"}>{message}</Notice> : null}

        {query.trim().length < 2 ? (
          <EmptyState title={t("startTitle")} hint={t("startHint")} />
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
                <p className="text-sm text-stone-500">{owner.phone ?? t("noPhone")}</p>
              </div>
              {owner.pets.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">{t("noPets")}</p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {owner.pets.map((pet) => {
                    return (
                      <li key={pet.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected({ owner, pet });
                            setCreating(false);
                            setMessage(null);
                          }}
                          className="flex min-h-14 w-full flex-col items-start rounded-xl border border-stone-200 px-3 py-2 text-left hover:border-coral hover:bg-orange-50"
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
              <h2 className="font-semibold">{t("newCustomer")}</h2>
              <p className="text-sm text-stone-500">{t("newCustomerHint")}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setCreating((v) => !v)}>
              {creating ? t("closeForm") : t("createCustomer")}
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
                setMessage(null);
                setQuery(owner.phone ?? pet.name);
              }}
              onError={setMessage}
              start={start}
            />
          ) : null}
        </div>
          </>
        )}
      </section>

      <aside className="space-y-3">
        <h2 className="font-semibold">{t("queueTitle")}</h2>
        {initialWaiting.length === 0 ? (
          <EmptyState title={t("emptyQueue")} hint={t("emptyQueueHint")} />
        ) : (
          <ul className="space-y-2">
            {initialWaiting.map((enc) => (
                <li key={enc.id}>
                  <Link href={`/${branch}/encounters/${enc.id}`} className="clinic-card block p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-stone-400">{enc.number}</p>
                      <StatusBadge
                        value={enc.status}
                        map={{
                          WAITING: status("WAITING"),
                          IN_PROGRESS: status("IN_PROGRESS"),
                          PENDING_RESULT: status("PENDING_RESULT"),
                          READY_TO_BILL: status("READY_TO_BILL"),
                          CLOSED: status("CLOSED"),
                          CANCELLED: status("CANCELLED"),
                        }}
                      />
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
  const t = useTranslations("reception");
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
      <Field label={t("ownerName")}>
        <Input name="ownerFirstName" required autoComplete="name" />
      </Field>
      <Field label={t("phone")}>
        <Input name="phone" inputMode="tel" required autoComplete="tel" />
      </Field>
      <Field label={t("petName")}>
        <Input name="petName" required />
      </Field>
      <Field label={t("species")}>
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
          {pending ? t("saving") : t("saveAndWeigh")}
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
  const t = useTranslations("reception");
  const types = useTranslations("enum.EncounterType");
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
          <p className="text-sm text-stone-500">{t("selected")}</p>
          <h2 className="text-xl font-semibold">
            {selected.pet.name} · {selected.owner.displayName}
          </h2>
          <p className="text-sm text-stone-500">
            {selected.pet.speciesNameTh} · {selected.pet.code}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("changePet")}
        </Button>
      </div>
      <AlertChip labels={highAlerts.map((a) => a.label)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("weight")} hint={t("weightHint")}>
          <Input
            name="weightKg"
            inputMode="decimal"
            required
            defaultValue={selected.pet.currentWeightKg ?? ""}
            placeholder={t("weightPlaceholder")}
            autoFocus
          />
        </Field>
        <Field label={t("caseType")}>
          <Select name="type" defaultValue="OPD">
            {(["OPD", "VACCINE", "RECHECK", "EMERGENCY"] as const).map((k) => (
              <option key={k} value={k}>
                {types(k)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("complaint")}>
        <Input name="chiefComplaint" placeholder={t("complaintPlaceholder")} />
      </Field>
      <Button type="submit" className="h-12 w-full" variant="coral" disabled={pending}>
        {pending ? t("opening") : t("openCase")}
      </Button>
    </form>
  );
}
