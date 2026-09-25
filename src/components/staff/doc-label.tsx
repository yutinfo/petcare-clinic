import en from "@/lib/i18n/messages/en.json";
import th from "@/lib/i18n/messages/th.json";

type InvoiceLabel = keyof typeof th.invoice;

/** ป้ายบนเอกสารการเงิน: ไทยอยู่บรรทัดบน ภาษาที่สองอยู่บรรทัดล่างเสมอ */
export function DocLabel({ name }: { name: InvoiceLabel }) {
  return (
    <span className="inline-block align-top leading-tight">
      <span className="block">{th.invoice[name]}</span>
      <span className="block text-xs font-normal text-stone-500">{en.invoice[name]}</span>
    </span>
  );
}
