import { addSatang, assertSatang } from "@/modules/shared";

export type TaxCodeKind = "VAT7" | "VAT0" | "EXEMPT" | "NONVAT";

export type InvoiceLineInput = {
  amountSatang: number;
  taxCode: TaxCodeKind;
};

export type TaxProfileView = {
  isVatRegistered: boolean;
  vatRatePercent: number;
  pricesIncludeVat: boolean;
};

export type InvoiceTotals = {
  subtotalSatang: number;
  vatBaseSatang: number;
  vatSatang: number;
  exemptSatang: number;
  grandTotalSatang: number;
  lineVatSatang: number[];
};

/** VAT คำนวณที่ระดับบิลแล้วปันส่วนกลับลงบรรทัด — ห้ามบวก VAT รายบรรทัด */
export function computeInvoiceTotals(
  lines: InvoiceLineInput[],
  profile: TaxProfileView,
): InvoiceTotals {
  for (const line of lines) assertSatang(line.amountSatang);
  const subtotalSatang = addSatang(...lines.map((l) => l.amountSatang), 0);

  if (!profile.isVatRegistered) {
    return {
      subtotalSatang,
      vatBaseSatang: 0,
      vatSatang: 0,
      exemptSatang: subtotalSatang,
      grandTotalSatang: subtotalSatang,
      lineVatSatang: lines.map(() => 0),
    };
  }

  const rate = profile.vatRatePercent;
  const vatIndex: number[] = [];
  let vatGross = 0;
  let exemptSatang = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.taxCode === "VAT7") {
      vatIndex.push(i);
      vatGross += line.amountSatang;
    } else {
      exemptSatang += line.amountSatang;
    }
  }

  let vatBaseSatang = 0;
  let vatSatang = 0;
  if (vatGross > 0) {
    if (profile.pricesIncludeVat) {
      vatBaseSatang = Math.round((vatGross * 100) / (100 + rate));
      vatSatang = vatGross - vatBaseSatang;
    } else {
      vatBaseSatang = vatGross;
      vatSatang = Math.round((vatGross * rate) / 100);
    }
  }

  const grandTotalSatang = profile.pricesIncludeVat
    ? subtotalSatang
    : addSatang(vatBaseSatang, vatSatang, exemptSatang);

  const lineVatSatang = allocateVat(lines, vatIndex, vatGross, vatSatang);

  return {
    subtotalSatang,
    vatBaseSatang,
    vatSatang,
    exemptSatang,
    grandTotalSatang,
    lineVatSatang,
  };
}

function allocateVat(
  lines: InvoiceLineInput[],
  vatIndex: number[],
  vatGross: number,
  vatSatang: number,
): number[] {
  const out = lines.map(() => 0);
  if (vatIndex.length === 0 || vatGross === 0) return out;
  let remaining = vatSatang;
  for (let i = 0; i < vatIndex.length; i++) {
    const idx = vatIndex[i]!;
    if (i === vatIndex.length - 1) {
      out[idx] = remaining;
      break;
    }
    const share = Math.round((lines[idx]!.amountSatang / vatGross) * vatSatang);
    out[idx] = share;
    remaining -= share;
  }
  return out;
}
