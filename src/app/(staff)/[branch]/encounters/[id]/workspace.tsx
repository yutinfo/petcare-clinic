"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CHARGE_STATUS,
  ENCOUNTER_STATUS,
  ENCOUNTER_TYPE,
  ORDER_STATUS,
  PET_SEX,
  RX_STATUS,
  labelOf,
} from "@/components/staff/labels";
import { WaitMinutes, askToProceed } from "@/components/staff/live";
import { AlertChip, Field, Notice, StatusBadge } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatSatangTh } from "@/modules/shared/money";
import { formatThaiDate } from "@/modules/shared/date";
import type { getEncounterWorkspace } from "@/modules/clinical";
import {
  addendumAction,
  billEncounterAction,
  completeOrderAction,
  orderAction,
  prescribeAction,
  saveSoapAction,
  signSoapAction,
  statusAction,
  vitalsAction,
} from "./actions";

type Data = Awaited<ReturnType<typeof getEncounterWorkspace>>;

const SOAP_FIELDS = [
  {
    key: "subjective" as const,
    letter: "S",
    label: "อาการที่เจ้าของเล่า",
    hint: "กินได้ไหม อาเจียน ถ่าย เป็นมานานเท่าไร",
  },
  {
    key: "objective" as const,
    letter: "O",
    label: "สิ่งที่ตรวจพบ",
    hint: "สัญญาณชีพ ตรวจตามระบบ ผลที่เห็นวันนี้",
  },
  {
    key: "assessment" as const,
    letter: "A",
    label: "การวินิจฉัย",
    hint: "ปัญหาหลัก และรายการที่ต้องแยกโรค",
  },
  {
    key: "plan" as const,
    letter: "P",
    label: "แผนการรักษา",
    hint: "ยา แล็บ นัดครั้งหน้า คำแนะนำเจ้าของ",
  },
];

const SOAP_TEMPLATES: Record<string, { label: string; s: string; o: string; a: string; p: string }> = {
  gi: {
    label: "ท้องเสีย",
    s: "เจ้าของแจ้งว่าอาเจียน/ท้องเสีย กินได้น้อย",
    o: "T  HR  RR  BCS  เยื่อเมือก  CRT  ช่องท้อง",
    a: "ทางเดินอาหารอักเสบ — รอผลแล็บ",
    p: "ให้สารน้ำ, ยาแก้อาเจียน, อาหารอ่อน, นัดติดตาม",
  },
  skin: {
    label: "ผิวหนัง",
    s: "เกา คัน มีผื่น หรือขนร่วง",
    o: "ผิวหนัง รังแค แผล ปรสิต ต่อมน้ำเหลือง",
    a: "ผิวหนังอักเสบ — แยกสาเหตุภูมิแพ้/ปรสิต/ติดเชื้อ",
    p: "ยาภายนอก, ตัวอย่างผิวหนัง, อาหาร, นัดติดตาม",
  },
  wellness: {
    label: "ตรวจสุขภาพ",
    s: "มาตรวจสุขภาพประจำปี ไม่มีอาการผิดปกติ",
    o: "สัญญาณชีพปกติ ตรวจตามระบบไม่พบความผิดปกติ",
    a: "สุขภาพทั่วไปดี",
    p: "วัคซีนตามกำหนด ถ่ายพยาธิ แนะนำอาหาร",
  },
};

export function EncounterWorkspace({ branch, data }: { branch: string; data: Data }) {
  const router = useRouter();
  const canRead = data.can.clinicalRead;
  const canWrite = data.can.clinicalWrite;
  const canSign = data.can.clinicalSign;
  const canPrescribe = data.can.pharmacyPrescribe;
  const [tab, setTab] = useState<"soap" | "rx" | "orders">("soap");
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const refresh = () => router.refresh();
  const draft = data.soapNotes.find((s) => !s.signedAt) ?? data.soapNotes[0];
  const [soap, setSoap] = useState({
    id: draft?.id,
    subjective: draft?.subjective ?? data.chiefComplaint ?? "",
    objective: draft?.objective ?? "",
    assessment: draft?.assessment ?? "",
    plan: draft?.plan ?? "",
    signedAt: draft?.signedAt ?? null,
  });
  const openCharges = data.charges.filter((c) => c.status === "OPEN");
  const openTotal = openCharges.reduce((s, c) => s + c.amountSatang, 0);
  const highAlerts = data.pet.alerts.filter((a) => a.severity === "HIGH" || a.type === "ALLERGY");
  const latestVital = data.vitals[0];
  const setMsg = (text: string) => setNotice({ tone: "error", text });
  const setOk = (text: string) => setNotice({ tone: "ok", text });

  return (
    <div className="space-y-4">
      <header className="clinic-card space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-teal">{data.number}</p>
          <h1 className="text-2xl font-semibold">
            <Link href={`/${branch}/pets/${data.pet.id}`} className="hover:underline">
              {data.pet.name}
            </Link>
          </h1>
          <p className="text-sm text-stone-500">
            {data.pet.speciesNameTh}
            {data.pet.breedNameTh ? ` · ${data.pet.breedNameTh}` : ""} · {labelOf(PET_SEX, data.pet.sex)}
          </p>
          <p className="text-sm text-stone-500">
            เจ้าของ{" "}
            <Link href={`/${branch}/clients/${data.owner.id}`} className="text-teal hover:underline">
              {data.owner.name}
            </Link>
            {data.owner.phone ? ` · ${data.owner.phone}` : ""}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-cream px-3 py-2">
            <dt className="text-sm text-stone-500">น้ำหนัก</dt>
            <dd className="font-semibold">{data.pet.currentWeightKg ?? "—"} กก.</dd>
          </div>
          <div className="rounded-xl bg-cream px-3 py-2">
            <dt className="text-sm text-stone-500">รอมาแล้ว</dt>
            <dd className="font-semibold">
              <WaitMinutes iso={data.arrivedAt} prefix="" />
            </dd>
          </div>
          <div className="rounded-xl bg-cream px-3 py-2">
            <dt className="text-sm text-stone-500">สัญญาณชีพล่าสุด</dt>
            <dd className="font-semibold">
              {latestVital
                ? `T ${latestVital.temperatureC ?? "—"} · HR ${latestVital.heartRateBpm ?? "—"} · RR ${latestVital.respRateBpm ?? "—"}`
                : "ยังไม่บันทึก"}
            </dd>
          </div>
        </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={data.status} map={ENCOUNTER_STATUS} />
          <StatusBadge value={data.type} map={ENCOUNTER_TYPE} />
        </div>
        <AlertChip labels={highAlerts.map((a) => a.label)} />
        <p className="text-sm text-stone-600">อาการ: {data.chiefComplaint ?? "—"}</p>
        <div className="flex flex-wrap gap-2">
          {canWrite && data.status === "WAITING" ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await statusAction(branch, data.id, "IN_PROGRESS");
                  refresh();
                })
              }
            >
              เรียกเข้าตรวจ
            </Button>
          ) : null}
          {canWrite && data.status === "IN_PROGRESS" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await statusAction(branch, data.id, "PENDING_RESULT");
                    refresh();
                  })
                }
              >
                รอผลแล็บ
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await statusAction(branch, data.id, "READY_TO_BILL");
                    refresh();
                  })
                }
              >
                ปิดการตรวจ
              </Button>
            </>
          ) : null}
          {canWrite && data.status === "PENDING_RESULT" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await statusAction(branch, data.id, "READY_TO_BILL");
                  refresh();
                })
              }
            >
              ปิดการตรวจ
            </Button>
          ) : null}
          {data.status === "READY_TO_BILL" ? (
            <Link
              href={`/${branch}/pos`}
              className="inline-flex h-9 items-center rounded-xl bg-teal px-3 text-sm font-medium text-white"
            >
              ไปคิดเงิน
            </Link>
          ) : null}
        </div>
        {data.priorSoap.length > 0 ? (
          <details className="rounded-xl bg-cream px-3 py-2 text-sm">
            <summary className="cursor-pointer text-sm text-stone-500">
              ประวัติที่ลงนามแล้ว {data.priorSoap.length} เคส
            </summary>
            <div className="mt-2 space-y-2">
              {data.priorSoap.map((p) => (
                <div key={p.encounterNumber}>
                  <p className="text-sm text-stone-500">
                    {p.encounterNumber} · {formatThaiDate(new Date(p.arrivedAt))}
                  </p>
                  <p>{p.assessment || "—"}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
        <Link href={`/${branch}/queue`} className="inline-block text-sm text-teal hover:underline">
          กลับกระดานคิว
        </Link>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="clinic-card min-w-0 p-5">
        {canRead ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ["soap", "SOAP"] as const,
                ...(canPrescribe ? ([["rx", "สั่งยา"]] as const) : []),
                ...(canWrite ? ([["orders", "คำสั่งแล็บ/หัตถการ"]] as const) : []),
              ]
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t ? "bg-teal text-white" : "bg-cream text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

        {!canRead ? (
          <p className="text-sm leading-relaxed text-stone-500">
            เวชระเบียน สั่งยา และคำสั่งตรวจเป็นงานของสัตวแพทย์ — เคาน์เตอร์ดูข้อมูลสัตว์ เวลารอ
            และคิดเงินจากแถบขวาได้ตามปกติ
          </p>
        ) : null}

        {canRead && tab === "soap" ? (
          <div className="mt-3 space-y-3">
            {canWrite ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(SOAP_TEMPLATES).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    className="rounded-full bg-sand px-3 py-1.5 text-xs font-medium"
                    onClick={() =>
                      setSoap((s) => ({
                        ...s,
                        subjective: v.s,
                        objective: v.o,
                        assessment: v.a,
                        plan: v.p,
                      }))
                    }
                  >
                    แม่แบบ: {v.label}
                  </button>
                ))}
              </div>
            ) : null}
            {SOAP_FIELDS.map((field) => (
              <label key={field.key} className="block space-y-1 text-sm">
                <span className="flex items-baseline gap-2">
                  <span className="font-semibold text-teal">{field.letter}</span>
                  <span className="font-medium">{field.label}</span>
                  <span className="text-sm text-stone-500">{field.hint}</span>
                </span>
                <Textarea
                  value={soap[field.key]}
                  disabled={!canWrite || Boolean(soap.signedAt)}
                  onChange={(e) => setSoap((s) => ({ ...s, [field.key]: e.target.value }))}
                />
              </label>
            ))}
            {canWrite ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending || Boolean(soap.signedAt)}
                  onClick={() =>
                    start(async () => {
                      const res = await saveSoapAction(branch, {
                        encounterId: data.id,
                        soapNoteId: soap.id,
                        ...soap,
                      });
                      if (!res.ok) setMsg(res.message);
                      else {
                        setSoap((s) => ({ ...s, id: res.id }));
                        setOk("บันทึกร่างแล้ว");
                        refresh();
                      }
                    })
                  }
                >
                  บันทึกร่าง
                </Button>
                {canSign ? (
                  <Button
                    variant="coral"
                    disabled={pending || Boolean(soap.signedAt) || !soap.id}
                    onClick={() =>
                      start(async () => {
                        if (!soap.id) return;
                        if (!askToProceed("ลงนามแล้วจะแก้ SOAP ไม่ได้ ต้องใช้บันทึกเพิ่มเท่านั้น ดำเนินการต่อ?")) return;
                        const res = await signSoapAction(branch, soap.id);
                        if (!res.ok) setMsg(res.message);
                        else {
                          setSoap((s) => ({ ...s, signedAt: res.signedAt }));
                          setOk("ลงนามแล้ว");
                          refresh();
                        }
                      })
                    }
                  >
                    ลงนาม
                  </Button>
                ) : null}
              </div>
            ) : null}
            {soap.signedAt && canWrite ? (
              <AddendumForm
                branch={branch}
                soapNoteId={soap.id!}
                addenda={draft?.addenda ?? []}
                pending={pending}
                start={start}
                onError={setMsg}
                onDone={() => {
                  setOk("เพิ่มบันทึกแล้ว");
                  refresh();
                }}
              />
            ) : canWrite ? (
              <p className="text-sm text-stone-500">บันทึกร่างก่อน แล้วค่อยลงนาม — หลังลงนามแก้ไม่ได้</p>
            ) : null}
            {canWrite ? (
              <VitalsForm
                branch={branch}
                encounterId={data.id}
                vitals={data.vitals}
                pending={pending}
                start={start}
                onError={setMsg}
                onDone={() => {
                  setOk("บันทึกสัญญาณชีพแล้ว");
                  refresh();
                }}
              />
            ) : data.vitals.length > 0 ? (
              <p className="text-sm text-stone-600">
                T {data.vitals[0]?.temperatureC ?? "—"}°C · HR {data.vitals[0]?.heartRateBpm ?? "—"} · RR{" "}
                {data.vitals[0]?.respRateBpm ?? "—"}
              </p>
            ) : null}
          </div>
        ) : null}

        {canPrescribe && tab === "rx" ? (
          <RxForm
            branch={branch}
            encounterId={data.id}
            products={data.catalog.products}
            prescriptions={data.prescriptions}
            pending={pending}
            start={start}
            onError={setMsg}
            onDone={refresh}
          />
        ) : null}

        {canWrite && tab === "orders" ? (
          <OrdersForm
            branch={branch}
            encounterId={data.id}
            services={data.catalog.services}
            orders={data.orders}
            pending={pending}
            start={start}
            onError={setMsg}
            onDone={refresh}
          />
        ) : null}
      </section>

      <aside className="clinic-card space-y-4 p-5 lg:sticky lg:top-20">
        <h2 className="font-semibold">ค่าใช้จ่ายในเคสนี้</h2>
        <ul className="space-y-2 text-sm">
          {data.charges.length === 0 ? <li className="text-stone-400">ยังไม่มีรายการ — สั่งยาหรือทำหัตถการแล้วจะโชว์ที่นี่</li> : null}
          {data.charges.map((c) => (
            <li key={c.id} className="flex justify-between gap-2">
              <span>
                {c.description}
                <span className="block text-sm text-stone-500">{labelOf(CHARGE_STATUS, c.status)}</span>
              </span>
              <span className="font-medium tabular-nums">{formatSatangTh(c.amountSatang)}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-stone-100 pt-3 text-lg font-semibold tabular-nums">
          รวมค้าง {formatSatangTh(openTotal)} บาท
        </p>
        <Button
          className="w-full"
          disabled={pending || openTotal === 0}
          onClick={() =>
            start(async () => {
              const ids = openCharges.map((c) => c.id);
              if (!askToProceed(`รับชำระเงินสด ${formatSatangTh(openTotal)} บาท?`)) return;
              const res = await billEncounterAction(branch, ids);
              if (res && !res.ok) setMsg(res.message);
            })
          }
        >
          รับชำระเงินสด
        </Button>
        <Link href={`/${branch}/pos`} className="block text-center text-sm text-teal hover:underline">
          ไปคิดเงินที่เคาน์เตอร์ (พร้อมเพย์ / บัตร)
        </Link>
      </aside>
      </div>
    </div>
  );
}

function VitalsForm({
  branch,
  encounterId,
  vitals,
  pending,
  start,
  onError,
  onDone,
}: {
  branch: string;
  encounterId: string;
  vitals: Data["vitals"];
  pending: boolean;
  start: (fn: () => Promise<void>) => void;
  onError: (m: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl bg-cream p-3">
      <p className="text-sm font-medium">สัญญาณชีพ</p>
      {vitals.length > 0 ? (
        <ul className="text-sm text-stone-500">
          {vitals.slice(0, 3).map((v) => (
            <li key={v.id}>
              T {v.temperatureC ?? "—"} · HR {v.heartRateBpm ?? "—"} · RR {v.respRateBpm ?? "—"}
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await vitalsAction(branch, {
              encounterId,
              temperatureC: String(data.get("temperatureC") ?? "") || undefined,
              heartRateBpm: String(data.get("heartRateBpm") ?? "") || undefined,
              respRateBpm: String(data.get("respRateBpm") ?? "") || undefined,
            });
            if (!res.ok) onError(res.message);
            else onDone();
          });
        }}
      >
        <Field label="อุณหภูมิ (°C)">
          <Input name="temperatureC" inputMode="decimal" aria-label="อุณหภูมิ องศาเซลเซียส" />
        </Field>
        <Field label="ชีพจร (ครั้ง/นาที)">
          <Input name="heartRateBpm" inputMode="numeric" aria-label="ชีพจร ครั้งต่อนาที" />
        </Field>
        <Field label="หายใจ (ครั้ง/นาที)">
          <Input name="respRateBpm" inputMode="numeric" aria-label="หายใจ ครั้งต่อนาที" />
        </Field>
        <div className="sm:col-span-3">
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            บันทึกสัญญาณชีพ
          </Button>
        </div>
      </form>
    </div>
  );
}

function RxForm({
  branch,
  encounterId,
  products,
  prescriptions,
  pending,
  start,
  onError,
  onDone,
}: {
  branch: string;
  encounterId: string;
  products: Data["catalog"]["products"];
  prescriptions: Data["prescriptions"];
  pending: boolean;
  start: (fn: () => Promise<void>) => void;
  onError: (m: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await prescribeAction(branch, {
              encounterId,
              productId: String(data.get("productId")),
              mgPerKg: String(data.get("mgPerKg") || "") || undefined,
              route: String(data.get("route") || "PO"),
              frequencyCode: String(data.get("frequencyCode") || "BID"),
              durationDays: Number(data.get("durationDays") || 7),
              withFood: true,
            });
            if (!res.ok) onError(res.message);
            else onDone();
          });
        }}
      >
        <Field label="ยา" className="sm:col-span-2">
          <Select name="productId" required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.strength ? ` ${p.strength}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ขนาด (มก./กก.)">
          <Input name="mgPerKg" defaultValue="20" />
        </Field>
        <Field label="จำนวนวัน">
          <Input name="durationDays" defaultValue="7" />
        </Field>
        <Field label="ช่องทาง">
          <Select name="route" defaultValue="PO">
            <option value="PO">กิน (ทางปาก)</option>
            <option value="SC">ฉีดใต้ผิวหนัง</option>
            <option value="IM">ฉีดเข้ากล้ามเนื้อ</option>
          </Select>
        </Field>
        <Field label="ความถี่">
          <Select name="frequencyCode" defaultValue="BID">
            <option value="SID">วันละครั้ง</option>
            <option value="BID">เช้า-เย็น</option>
            <option value="TID">วันละ 3 ครั้ง</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            บันทึกใบสั่งยา
          </Button>
        </div>
      </form>
      <ul className="space-y-2 text-sm">
        {prescriptions.length === 0 ? <li className="text-stone-400">ยังไม่มีใบสั่งในเคสนี้</li> : null}
        {prescriptions.map((rx) => (
          <li key={rx.id} className="rounded-xl bg-cream px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{rx.productName}</p>
              <StatusBadge value={rx.status} map={RX_STATUS} />
            </div>
            <p className="text-stone-500">{rx.instructionTh}</p>
            <p className="text-xs text-stone-400">
              {rx.totalQtyBase} {rx.doseUnit}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrdersForm({
  branch,
  encounterId,
  services,
  orders,
  pending,
  start,
  onError,
  onDone,
}: {
  branch: string;
  encounterId: string;
  services: Data["catalog"]["services"];
  orders: Data["orders"];
  pending: boolean;
  start: (fn: () => Promise<void>) => void;
  onError: (m: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await orderAction(branch, encounterId, String(data.get("serviceItemId")));
            if (!res.ok) onError(res.message);
            else onDone();
          });
        }}
      >
        <Select name="serviceItemId" className="flex-1">
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {formatSatangTh(s.priceSatang)} บาท
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={pending}>
          สั่ง
        </Button>
      </form>
      <ul className="space-y-2 text-sm">
        {orders.length === 0 ? <li className="text-stone-400">ยังไม่มีคำสั่ง</li> : null}
        {orders.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2">
            <span>
              {o.description}{" "}
              <span className="text-xs text-stone-400">{labelOf(ORDER_STATUS, o.status)}</span>
            </span>
            {o.status !== "COMPLETED" && o.status !== "CANCELLED" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await completeOrderAction(branch, o.id);
                    if (!res.ok) onError(res.message);
                    else onDone();
                  })
                }
              >
                ทำเสร็จ (คิดเงิน)
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddendumForm({
  branch,
  soapNoteId,
  addenda,
  pending,
  start,
  onError,
  onDone,
}: {
  branch: string;
  soapNoteId: string;
  addenda: { id: string; content: string; reason: string; createdAt: string }[];
  pending: boolean;
  start: (fn: () => Promise<void>) => void;
  onError: (m: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-stone-200 p-3">
      <p className="text-xs font-medium text-teal">ลงนามแล้ว — แก้ด้วยบันทึกเพิ่มเท่านั้น</p>
      {addenda.map((a) => (
        <div key={a.id} className="rounded-xl bg-cream px-3 py-2 text-sm">
          <p className="text-xs text-stone-400">{a.reason}</p>
          <p>{a.content}</p>
        </div>
      ))}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await addendumAction(branch, {
              soapNoteId,
              content: String(data.get("content") ?? ""),
              reason: String(data.get("reason") ?? ""),
            });
            if (!res.ok) onError(res.message);
            else onDone();
          });
        }}
      >
        <Input name="reason" placeholder="เหตุผลที่ต้องเพิ่ม" required />
        <Textarea name="content" placeholder="ข้อความเพิ่ม" required />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          เพิ่มบันทึก
        </Button>
      </form>
    </div>
  );
}
