import { BusinessError } from "@/modules/shared";

export type DoseRoundRule = "WHOLE" | "HALF" | "QUARTER" | "NONE";

export type DoseInput = {
  mgPerKg: number;
  weightKg: number;
  strengthMg: number;
  timesPerDay: number;
  durationDays: number;
  round?: DoseRoundRule;
};

export type DoseResult = {
  mgPerDose: number;
  unitsPerDoseRaw: number;
  unitsPerDose: number;
  totalQtyBase: number;
  instructionHint: string;
};

const FREQ_TH: Record<string, { times: number; th: string }> = {
  SID: { times: 1, th: "วันละ 1 ครั้ง" },
  BID: { times: 2, th: "วันละ 2 ครั้ง เช้า-เย็น" },
  TID: { times: 3, th: "วันละ 3 ครั้ง" },
  QID: { times: 4, th: "วันละ 4 ครั้ง" },
  q8h: { times: 3, th: "ทุก 8 ชั่วโมง" },
  q12h: { times: 2, th: "ทุก 12 ชั่วโมง" },
  PRN: { times: 1, th: "เมื่อมีอาการ" },
};

const ROUTE_TH: Record<string, string> = {
  PO: "กิน",
  SC: "ฉีดใต้ผิวหนัง",
  IV: "ฉีดเข้าหลอดเลือด",
  IM: "ฉีดเข้ากล้ามเนื้อ",
  TOPICAL: "ทาภายนอก",
  OTIC: "หยอดหู",
  OPHTH: "หยอดตา",
};

export function frequencyTimesPerDay(code: string): number {
  const found = FREQ_TH[code];
  if (!found) throw new BusinessError("ไม่รู้จักรหัสความถี่ยานี้");
  return found.times;
}

export function parseStrengthMg(strength: string | null | undefined): number | null {
  if (!strength) return null;
  const m = strength.trim().match(/^(\d+(?:\.\d+)?)\s*mg\b/i);
  if (!m) return null;
  return Number(m[1]);
}

export function roundDose(raw: number, rule: DoseRoundRule): number {
  if (rule === "NONE") return raw;
  const step = rule === "WHOLE" ? 1 : rule === "HALF" ? 0.5 : 0.25;
  return Math.round(raw / step) * step;
}

/** US-07: mg/kg × น้ำหนัก ÷ ความแรง = จำนวนต่อครั้ง แล้ว × ครั้งต่อวัน × จำนวนวัน */
export function calculateDose(input: DoseInput): DoseResult {
  if (!(input.mgPerKg > 0) || !(input.weightKg > 0) || !(input.strengthMg > 0)) {
    throw new BusinessError("ข้อมูลขนาดยาไม่ครบ");
  }
  if (!(input.timesPerDay > 0) || !(input.durationDays > 0)) {
    throw new BusinessError("ความถี่หรือจำนวนวันไม่ถูกต้อง");
  }
  const mgPerDose = input.mgPerKg * input.weightKg;
  const unitsPerDoseRaw = mgPerDose / input.strengthMg;
  const unitsPerDose = roundDose(unitsPerDoseRaw, input.round ?? "WHOLE");
  if (unitsPerDose <= 0) throw new BusinessError("ขนาดยาที่ปัดแล้วเป็นศูนย์");
  const totalQtyBase = Number((unitsPerDose * input.timesPerDay * input.durationDays).toFixed(4));
  return {
    mgPerDose: Number(mgPerDose.toFixed(4)),
    unitsPerDoseRaw: Number(unitsPerDoseRaw.toFixed(4)),
    unitsPerDose,
    totalQtyBase,
    instructionHint: `ครั้งละ ${unitsPerDose} หน่วย`,
  };
}

export function buildInstructionTh(input: {
  doseAmount: number;
  doseUnit: string;
  route: string;
  frequencyCode: string;
  durationDays: number;
  withFood?: boolean | null;
}): string {
  const verb = ROUTE_TH[input.route] ?? input.route;
  const freq = FREQ_TH[input.frequencyCode]?.th ?? input.frequencyCode;
  const food =
    input.withFood === true ? " หลังอาหาร" : input.withFood === false ? " ก่อนอาหาร" : "";
  return `${verb}ครั้งละ ${trimNum(input.doseAmount)} ${input.doseUnit} ${freq}${food} ติดต่อกัน ${input.durationDays} วัน`;
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}
