export const STAFF_NAV = [
  { href: "", label: "หน้าหลัก", hint: "ภาพรวมวันนี้", tone: "sun", icon: "home" },
  { href: "reception", label: "รับสัตว์", hint: "เปิดเคส walk-in", tone: "coral", icon: "reception" },
  { href: "queue", label: "กระดานคิว", hint: "สถานะห้องตรวจ", tone: "teal", icon: "queue" },
  { href: "appointments", label: "นัดหมาย", hint: "ปฏิทินวันนี้", tone: "lavender", icon: "appointments" },
  { href: "clients", label: "ลูกค้า", hint: "ทะเบียนเจ้าของ", tone: "mint", icon: "clients" },
  { href: "pharmacy", label: "ห้องยา", hint: "จ่ายยา FEFO", tone: "rose", icon: "pharmacy" },
  { href: "inventory", label: "คลัง", hint: "สต็อกและรับเข้า", tone: "sun", icon: "inventory" },
  { href: "pos", label: "ขายหน้าร้าน", hint: "คิดเงินออกบิล", tone: "teal", icon: "pos" },
  { href: "billing", label: "กะเงินสด", hint: "เปิดกะและปิดกะ", tone: "sun", icon: "billing" },
  { href: "boarding", label: "ฝากเลี้ยง", hint: "ผังกรง", tone: "sky", icon: "boarding" },
  { href: "grooming", label: "อาบน้ำตัดขน", hint: "คิวช่าง", tone: "rose", icon: "grooming" },
] as const;

export const TONE_CLASS: Record<string, string> = {
  sun: "bg-amber-100 text-amber-800",
  coral: "bg-orange-100 text-orange-800",
  teal: "bg-teal-100 text-teal-800",
  lavender: "bg-violet-100 text-violet-800",
  mint: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
  sky: "bg-sky-100 text-sky-800",
};
