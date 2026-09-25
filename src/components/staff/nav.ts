export const STAFF_NAV = [
  { href: "", key: "home", tone: "sun", icon: "home" },
  { href: "reception", key: "reception", tone: "coral", icon: "reception" },
  { href: "queue", key: "queue", tone: "teal", icon: "queue" },
  { href: "appointments", key: "appointments", tone: "lavender", icon: "appointments" },
  { href: "clients", key: "clients", tone: "mint", icon: "clients" },
  { href: "pharmacy", key: "pharmacy", tone: "rose", icon: "pharmacy" },
  { href: "inventory", key: "inventory", tone: "sun", icon: "inventory" },
  { href: "pos", key: "pos", tone: "teal", icon: "pos" },
  { href: "billing", key: "billing", tone: "sun", icon: "billing" },
  { href: "boarding", key: "boarding", tone: "sky", icon: "boarding" },
  { href: "grooming", key: "grooming", tone: "rose", icon: "grooming" },
] as const;

/** พื้นการ์ดของแผนก — โทนเดียวกับไอคอนในเมนู และคนละความหมายกับสีสถานะคิว */
export const DEPARTMENT_SURFACE = {
  boarding: "bg-sky-50 text-sky-950",
  grooming: "bg-rose-50 text-rose-950",
} as const;

export const TONE_CLASS: Record<string, string> = {
  sun: "bg-amber-100 text-amber-800",
  coral: "bg-orange-100 text-orange-800",
  teal: "bg-teal-100 text-teal-800",
  lavender: "bg-violet-100 text-violet-800",
  mint: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
  sky: "bg-sky-100 text-sky-800",
};
