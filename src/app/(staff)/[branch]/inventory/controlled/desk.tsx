"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/staff/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { getControlledRegister } from "@/modules/inventory";

type Report = Awaited<ReturnType<typeof getControlledRegister>>;

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function toCsv(report: Report): string {
  const header = [
    "ลำดับ",
    "วันเวลา",
    "ประเภทรายการ",
    "เอกสารอ้างอิง",
    "ล็อต",
    "วันหมดอายุ",
    "สัตว์ (เจ้าของ)",
    "ผู้สั่งใช้",
    "รับเข้า",
    "จ่ายออก",
    "คงเหลือ",
    "ผู้ทำรายการ",
    "พยาน",
    "หมายเหตุ",
  ];
  const rows = report.lines.map((l) => [
    String(l.lineNo),
    l.occurredAtTh,
    l.typeTh,
    l.ref,
    l.lotNo,
    l.expiryDate,
    l.petLabel,
    l.prescriber,
    l.inbound,
    l.outbound,
    l.balanceAfter,
    l.performedBy,
    l.witness,
    l.note,
  ]);
  const extra = [
    [],
    ["ยกมา", report.broughtForward, "รับเข้า", report.inbound, "จ่ายออก", report.outbound, "คงเหลือตามบัญชี", report.lastBalance],
  ];
  if (report.mismatch) {
    extra.push(["ยอดคำนวณได้", report.computedBalance, "ไม่ตรงกับคงเหลือแถวสุดท้าย", report.lastBalance]);
  }
  return [header, ...rows, ...extra].map((cols) => cols.map((c) => csvCell(String(c))).join(",")).join("\r\n");
}

export function ControlledRegisterDesk({
  branch,
  products,
  yearMonth,
  productId,
  report,
}: {
  branch: string;
  products: { id: string; code: string; name: string }[];
  yearMonth: string;
  productId: string;
  report: Report | null;
}) {
  const router = useRouter();

  function go(nextProduct: string, nextMonth: string) {
    const q = new URLSearchParams();
    if (nextProduct) q.set("productId", nextProduct);
    if (nextMonth) q.set("month", nextMonth);
    router.replace(`/${branch}/inventory/controlled?${q.toString()}`);
  }

  function downloadCsv() {
    if (!report) return;
    const blob = new Blob(["\uFEFF" + toCsv(report)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${report.fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <form
        className="no-print clinic-card flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          go(String(data.get("productId") ?? ""), String(data.get("month") ?? ""));
        }}
      >
        {products.length === 0 ? (
          <p className="text-sm text-stone-500">
            ยังไม่มียาที่ตั้งเป็นยาควบคุม — ไปที่คลังสินค้าแล้วทำเครื่องหมายยาควบคุมก่อน จึงพิมพ์ทะเบียนได้
          </p>
        ) : (
          <>
            <label className="space-y-1 text-sm">
              <span className="font-medium">ยา</span>
              <Select name="productId" defaultValue={productId} className="min-w-56">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">เดือน</span>
              <Input name="month" type="month" defaultValue={yearMonth} />
            </label>
            <Button type="submit">เปิดทะเบียน</Button>
            {report ? (
              <>
                <Button type="button" variant="outline" onClick={downloadCsv}>
                  ดาวน์โหลด CSV
                </Button>
                <Button type="button" variant="outline" onClick={() => window.print()}>
                  พิมพ์ PDF
                </Button>
              </>
            ) : null}
          </>
        )}
      </form>

      {products.length === 0 ? (
        <EmptyState
          title="ยังไม่มียาควบคุมในรายการ"
          hint="ตั้งค่าที่หน้าคลังก่อน หน้านี้เป็นทะเบียนสำหรับพิมพ์และดาวน์โหลดเท่านั้น"
        />
      ) : !report ? (
        <EmptyState title="เลือกยาและเดือน" hint="ทะเบียนหนึ่งแผ่นต่อยาหนึ่งรายการ" />
      ) : (
        <article className="clinic-card print-sheet relative overflow-x-auto p-6">
          {report.isDraft ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-semibold text-stone-200">
              ร่าง
            </p>
          ) : null}
          <header className="relative space-y-1 text-sm">
            <p className="text-center text-xs font-medium tracking-wide text-teal">
              ทะเบียนยาควบคุม — {report.clinicName} สาขา {report.branchName}
            </p>
            <h1 className="text-center text-xl font-semibold">เดือน {report.monthLabel}</h1>
            <p>
              ยา: {report.product.name}
              {report.product.genericName ? ` (${report.product.genericName})` : ""}{" "}
              {report.product.strength} {report.product.dosageForm ?? ""}
            </p>
            <p>
              ประเภทควบคุม: {report.product.controlledClass ?? "—"} · หน่วยนับ: {report.product.baseUnit} · ยอดยกมา:{" "}
              {report.broughtForward} {report.product.baseUnit}
            </p>
          </header>
          <table className="relative mt-4 w-full min-w-[64rem] text-left text-xs">
            <thead>
              <tr className="border-b text-stone-500">
                <th className="py-2">#</th>
                <th>วัน-เวลา</th>
                <th>ประเภท</th>
                <th>เอกสาร</th>
                <th>ล็อต / หมดอายุ</th>
                <th>สัตว์ (เจ้าของ)</th>
                <th>ผู้สั่งใช้</th>
                <th className="text-right">รับเข้า</th>
                <th className="text-right">จ่ายออก</th>
                <th className="text-right">คงเหลือ</th>
                <th>ผู้ทำ</th>
                <th>พยาน</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-6 text-center text-stone-400">
                    ไม่มีรายการในเดือนนี้
                  </td>
                </tr>
              ) : (
                report.lines.map((l) => (
                  <tr key={l.lineNo} className="border-b border-stone-100">
                    <td className="py-1.5">{l.lineNo}</td>
                    <td>{l.occurredAtTh}</td>
                    <td>{l.typeTh}</td>
                    <td>{l.ref}</td>
                    <td>
                      {l.lotNo}
                      {l.expiryDate ? ` / ${l.expiryDate}` : ""}
                    </td>
                    <td>{l.petLabel || "—"}</td>
                    <td>{l.prescriber || "—"}</td>
                    <td className="text-right tabular-nums">{l.inbound}</td>
                    <td className="text-right tabular-nums">{l.outbound}</td>
                    <td className="text-right tabular-nums font-medium">{l.balanceAfter}</td>
                    <td>{l.performedBy}</td>
                    <td>{l.witness || "—"}</td>
                    <td>{l.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="relative mt-4 text-sm">
            ยกมา {report.broughtForward} + รับเข้า {report.inbound} − จ่ายออก {report.outbound} = คงเหลือตามบัญชี{" "}
            {report.lastBalance} {report.product.baseUnit}
          </p>
          {report.mismatch ? (
            <p className="relative mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              ยอดที่บวกลบได้ {report.computedBalance} ไม่ตรงกับคงเหลือแถวสุดท้าย {report.lastBalance} — ไม่แก้ตัวเลขให้ตรงกัน
              (ledger เป็นบันทึกเดิม)
            </p>
          ) : null}
          <p className="relative mt-6 text-xs text-stone-400">
            คงเหลือจากการนับจริง ____________ ผลต่าง ____________ เหตุผล ______________________
          </p>
          <p className="relative mt-3 text-xs text-stone-400">
            ผู้จัดทำ ______________ ผู้ควบคุม ______________ พยาน ______________ วันที่ ______________
          </p>
        </article>
      )}
    </div>
  );
}
