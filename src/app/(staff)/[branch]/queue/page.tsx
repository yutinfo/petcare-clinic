import Link from "next/link";
import { redirect } from "next/navigation";
import { ENCOUNTER_TYPE, labelOf } from "@/components/staff/labels";
import { RefreshButton, WaitMinutes } from "@/components/staff/live";
import { EmptyState, PageHeader } from "@/components/staff/ui";
import { listWhiteboard } from "@/modules/clinical";
import { UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";

const COLS = [
  { key: "WAITING", title: "รอตรวจ", tone: "border-amber-200 bg-amber-50/80" },
  { key: "IN_PROGRESS", title: "กำลังตรวจ", tone: "border-sky-200 bg-sky-50/80" },
  { key: "PENDING_RESULT", title: "รอผล", tone: "border-violet-200 bg-violet-50/80" },
  { key: "READY_TO_BILL", title: "รอชำระเงิน", tone: "border-emerald-200 bg-emerald-50/80" },
] as const;

export default async function QueuePage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const rows = await listWhiteboard(ctx);
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="กระดานคิว"
          title={rows.length === 0 ? "วันนี้ยังไม่มีเคสเปิด" : `วันนี้มี ${rows.length} เคสที่ยังไม่ปิด`}
          description="กดการ์ดเพื่อเข้าห้องตรวจ · สีแดงคือรอเกิน 20 นาที"
        >
          <RefreshButton label="รีเฟรชคิว" />
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((col) => {
            const items = rows.filter((r) => r.status === col.key);
            return (
              <section key={col.key} className={`rounded-3xl border p-4 ${col.tone}`}>
                <h2 className="mb-3 font-semibold">
                  {col.title} <span className="text-sm font-normal opacity-70">{items.length}</span>
                </h2>
                {items.length === 0 ? (
                  <p className="text-sm text-stone-500">ว่าง</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((enc) => (
                        <li key={enc.id}>
                          <Link
                            href={`/${branch}/encounters/${enc.id}`}
                            className="clinic-card block p-3 hover:ring-2 hover:ring-teal/30"
                          >
                            <p className="text-xs text-stone-400">{enc.number}</p>
                            <p className="font-medium">
                              {enc.petName}{" "}
                              <span className="text-sm font-normal text-stone-500">{enc.speciesNameTh}</span>
                            </p>
                            <p className="text-xs text-stone-500">{enc.ownerName}</p>
                            <p className="mt-1 text-xs text-stone-400">
                              {labelOf(ENCOUNTER_TYPE, enc.type)} · <WaitMinutes iso={enc.arrivedAt} />
                              {enc.chiefComplaint ? ` · ${enc.chiefComplaint}` : ""}
                            </p>
                            {enc.alerts.length > 0 ? (
                              <p className="mt-1 text-xs text-rose-700">
                                {enc.alerts.map((a) => a.label).join(" · ")}
                              </p>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
        {rows.length === 0 ? (
          <EmptyState title="ยังไม่มีคิว" hint="เปิดเคสจากเคาน์เตอร์รับสัตว์ แล้วเคสจะมาโชว์ที่นี่">
            <Link
              href={`/${branch}/reception`}
              className="inline-flex h-11 items-center rounded-full bg-coral px-5 text-sm font-medium text-white"
            >
              ไปเคาน์เตอร์รับสัตว์
            </Link>
          </EmptyState>
        ) : null}
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
