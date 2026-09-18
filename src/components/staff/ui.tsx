import { cn } from "@/lib/utils";
import { labelOf } from "./labels";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-coral">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-stone-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="clinic-card px-5 py-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint ? <p className="mt-1 text-sm text-stone-500">{hint}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function Notice({
  tone = "error",
  children,
}: {
  tone?: "error" | "ok" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900"
        : "bg-rose-50 text-rose-800";
  return <p className={cn("rounded-xl px-3 py-2 text-sm", cls)}>{children}</p>;
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5 text-sm", className)}>
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-stone-400">{hint}</span> : null}
    </label>
  );
}

const BADGE_TONE: Record<string, string> = {
  WAITING: "bg-amber-100 text-amber-900",
  IN_PROGRESS: "bg-sky-100 text-sky-900",
  PENDING_RESULT: "bg-violet-100 text-violet-900",
  READY_TO_BILL: "bg-emerald-100 text-emerald-900",
  READY_FOR_PICKUP: "bg-emerald-100 text-emerald-900",
  DRYING: "bg-orange-100 text-orange-900",
  CHECKED_IN: "bg-sky-100 text-sky-900",
  REQUESTED: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-teal-100 text-teal-900",
  ACTIVE: "bg-rose-100 text-rose-900",
  PARTIALLY_DISPENSED: "bg-orange-100 text-orange-900",
  OPEN: "bg-amber-100 text-amber-900",
  PAID: "bg-emerald-100 text-emerald-900",
  ISSUED: "bg-teal-100 text-teal-900",
  COMPLETED: "bg-stone-100 text-stone-600",
  CLOSED: "bg-stone-100 text-stone-600",
  CANCELLED: "bg-stone-100 text-stone-500",
  VOID: "bg-stone-100 text-stone-500",
  NO_SHOW: "bg-rose-100 text-rose-800",
  EMERGENCY: "bg-rose-100 text-rose-800",
};

export function StatusBadge({
  value,
  map,
  className,
}: {
  value: string;
  map: Record<string, string>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium",
        BADGE_TONE[value] ?? "bg-stone-100 text-stone-700",
        className,
      )}
    >
      {labelOf(map, value)}
    </span>
  );
}

export function AlertChip({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
      แพ้ยา / เตือน: {labels.join(" · ")}
    </p>
  );
}
