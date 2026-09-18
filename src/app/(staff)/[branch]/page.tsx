import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/staff/ui";
import { ENCOUNTER_STATUS, labelOf, waitMinutes } from "@/components/staff/labels";
import { WaitMinutes } from "@/components/staff/live";
import { listWaitingEncounters } from "@/modules/clinical";
import { formatSatangTh, UnauthenticatedError } from "@/modules/shared";
import { getBranchDashboard } from "@/modules/reporting";
import { auth } from "@/server/auth/config";
import { getStaffContext } from "@/server/staff-context";

export default async function BranchHomePage({
  params,
}: {
  params: Promise<{ branch: string }>;
}) {
  const { branch } = await params;
  try {
    const [ctx, session] = await Promise.all([getStaffContext(branch), auth()]);
    const [dash, waiting] = await Promise.all([getBranchDashboard(ctx), listWaitingEncounters(ctx)]);
    const hour = new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Bangkok" });
    const hello =
      Number(hour) < 12 ? "สวัสดีตอนเช้า" : Number(hour) < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
    const name = session?.user.displayName ?? "";
    const overdue = waiting.filter((w) => waitMinutes(w.arrivedAt) >= 20).length;

    const cards = [
      {
        href: `/${branch}/queue`,
        label: "รอตรวจ",
        value: String(dash.waiting),
        tone: "bg-amber-50 text-amber-900",
        hint: overdue > 0 ? `เกิน 20 นาที ${overdue} เคส` : "คิวหน้าเคาน์เตอร์",
      },
      {
        href: `/${branch}/queue`,
        label: "กำลังตรวจ",
        value: String(dash.inProgress),
        tone: "bg-sky-50 text-sky-900",
        hint: "อยู่ในห้องตรวจ",
      },
      {
        href: `/${branch}/pos`,
        label: "รอชำระเงิน",
        value: String(dash.readyToBill),
        tone: "bg-emerald-50 text-emerald-900",
        hint: "ปิดเคสแล้ว ยังไม่คิดเงิน",
      },
      {
        href: `/${branch}/pos`,
        label: "รายได้วันนี้",
        value: formatSatangTh(dash.todayRevenueSatang),
        tone: "bg-teal-50 text-teal-950",
        hint: "บาท · บิลที่ออกแล้ว",
      },
      {
        href: `/${branch}/boarding`,
        label: "ฝากเลี้ยง",
        value: `${dash.boarding}/${dash.kennels}`,
        tone: "bg-violet-50 text-violet-900",
        hint: "กรงที่ใช้อยู่ / ทั้งหมด",
      },
      {
        href: `/${branch}/grooming`,
        label: "คิวกรูมมิ่ง",
        value: String(dash.grooming),
        tone: "bg-rose-50 text-rose-900",
        hint: "งานที่ยังไม่ส่งมอบ",
      },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="วันนี้ที่คลินิก"
          title={`${hello}${name ? ` คุณ${name}` : ""}`}
          description="เริ่มจากค้นลูกค้าที่เคาน์เตอร์ แล้วส่งเข้าห้องตรวจ — คิดเงินรวมใบเดียวตอนท้าย"
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className={`clinic-card p-5 ${c.tone}`}>
              <p className="text-sm opacity-80">{c.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</p>
              <p className="mt-1 text-xs opacity-70">{c.hint}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">คิวที่รออยู่</h2>
              <Link href={`/${branch}/queue`} className="text-sm text-teal hover:underline">
                เปิดกระดานคิว
              </Link>
            </div>
            {waiting.length === 0 ? (
              <div className="clinic-card p-6">
                <p className="font-medium">ยังไม่มีเคสรอตรวจ</p>
                <p className="mt-1 text-sm text-stone-500">เมื่อลูกค้าเดินเข้ามา ให้เปิดเคสจากเคาน์เตอร์รับสัตว์</p>
                <Link
                  href={`/${branch}/reception`}
                  className="mt-4 inline-flex h-11 items-center rounded-full bg-coral px-5 text-sm font-medium text-white hover:bg-orange-600"
                >
                  ไปเคาน์เตอร์รับสัตว์
                </Link>
              </div>
            ) : (
              <ul className="grid gap-2">
                {waiting.map((enc) => (
                    <li key={enc.id}>
                      <Link href={`/${branch}/encounters/${enc.id}`} className="clinic-card flex items-center justify-between gap-3 p-4">
                        <div>
                          <p className="text-xs text-stone-400">{enc.number}</p>
                          <p className="font-medium">
                            {enc.petName}{" "}
                            <span className="font-normal text-stone-500">{enc.speciesNameTh}</span>
                          </p>
                          <p className="text-sm text-stone-500">
                            {enc.ownerName}
                            {enc.chiefComplaint ? ` · ${enc.chiefComplaint}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-stone-400">{labelOf(ENCOUNTER_STATUS, enc.status)}</p>
                          <p className="text-sm font-medium text-stone-500">
                            <WaitMinutes iso={enc.arrivedAt} prefix="" />
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <aside className="space-y-3">
            <Link href={`/${branch}/reception`} className="clinic-card block p-5">
              <p className="text-sm font-medium text-coral">งานหลัก</p>
              <h2 className="mt-1 text-xl font-semibold">เปิดเคส walk-in</h2>
              <p className="mt-2 text-sm text-stone-500">ค้นจากเบอร์หรือชื่อ แล้วชั่งน้ำหนักในหน้าเดียว</p>
              <span className="mt-4 inline-flex h-11 items-center rounded-full bg-coral px-5 text-sm font-medium text-white">
                ไปเคาน์เตอร์
              </span>
            </Link>
            <Link href={`/${branch}/pos`} className="clinic-card block p-5">
              <p className="text-sm font-medium text-teal">คิดเงิน</p>
              <h2 className="mt-1 text-xl font-semibold">รวมบิลใบเดียว</h2>
              <p className="mt-2 text-sm text-stone-500">รายการค้างจากห้องตรวจ ยา ฝากเลี้ยง และของหน้าร้าน</p>
              <span className="mt-4 inline-flex h-11 items-center rounded-full bg-teal px-5 text-sm font-medium text-white">
                ไปขายหน้าร้าน
              </span>
            </Link>
          </aside>
        </div>
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
