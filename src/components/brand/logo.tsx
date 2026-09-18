import { cn } from "@/lib/utils";

export function ClinicMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
        <rect width="40" height="40" rx="12" fill="#0f766e" />
        <circle cx="14" cy="14" r="3.2" fill="#fdba74" />
        <circle cx="26" cy="13" r="3.2" fill="#fde68a" />
        <circle cx="12" cy="23" r="2.8" fill="#f9a8d4" />
        <circle cx="28" cy="22" r="2.8" fill="#c4b5fd" />
        <ellipse cx="20" cy="27" rx="7" ry="5.5" fill="#fff" />
      </svg>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-wide text-teal">PetCare</span>
        <span className="block text-xs text-stone-500">คลินิกรักสัตว์</span>
      </span>
    </span>
  );
}
