"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Banknote,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  Menu,
  Package,
  PawPrint,
  Pill,
  Scissors,
  Stethoscope,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { ClinicMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { STAFF_NAV, TONE_CLASS } from "./nav";

const ICONS = {
  home: PawPrint,
  reception: Stethoscope,
  queue: LayoutGrid,
  appointments: CalendarDays,
  clients: Users,
  pharmacy: Pill,
  inventory: Package,
  pos: Banknote,
  billing: ClipboardList,
  boarding: Warehouse,
  grooming: Scissors,
} as const;

const DOCK = ["reception", "queue", "pos", "pharmacy"] as const;

export function StaffShell({
  branch,
  tenantName,
  branchName,
  displayName,
  signOut,
  children,
}: {
  branch: string;
  tenantName: string;
  branchName: string;
  displayName: string;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Bangkok",
        }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function hrefOf(itemHref: string) {
    return `/${branch}${itemHref ? `/${itemHref}` : ""}`;
  }

  function isActive(itemHref: string) {
    const path = hrefOf(itemHref);
    if (!itemHref) return pathname === path || pathname === `${path}/`;
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/60 bg-white/85 px-3 py-5 backdrop-blur-md lg:flex">
        <Link href={`/${branch}`} className="px-2">
          <ClinicMark />
        </Link>
        <p className="mt-4 px-2 text-[13px] font-medium leading-5 text-stone-500">
          {tenantName} · {branchName}
        </p>
        <nav className="mt-4 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {STAFF_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={hrefOf(item.href)}
              label={item.label}
              hint={item.hint}
              tone={item.tone}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
        </nav>
        <div className="mt-3 rounded-2xl bg-cream px-3 py-3">
          <p className="text-sm font-medium text-ink">{displayName}</p>
          <p className="text-sm text-stone-500">พนักงานคลินิก</p>
          <div className="mt-2">{signOut}</div>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <Link href={`/${branch}`} className="lg:hidden">
            <ClinicMark />
          </Link>
          <p className="hidden text-sm text-stone-500 lg:block">
            สวัสดีคุณ <span className="font-medium text-ink">{displayName}</span>
            <span className="mx-2 text-stone-300">·</span>
            <span className="tabular-nums">{clock}</span>
          </p>
          <p className="hidden text-sm text-stone-500 lg:block">
            {tenantName} · {branchName}
          </p>
          <p className="text-sm tabular-nums text-stone-500 lg:hidden">{clock}</p>
        </div>
      </header>

      <main className="px-4 py-6 pb-28 lg:px-8 lg:pb-8">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden">
        <ul className="grid grid-cols-5 gap-1">
          {DOCK.map((key) => {
            const item = STAFF_NAV.find((n) => n.href === key);
            if (!item) return null;
            const Icon = ICONS[item.icon];
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={hrefOf(item.href)}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center rounded-2xl text-[11px] font-medium",
                    active ? "bg-cream text-teal" : "text-stone-500",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex min-h-12 w-full flex-col items-center justify-center rounded-2xl text-[11px] font-medium text-stone-500"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
              เมนู
            </button>
          </li>
        </ul>
      </nav>

      {open ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">ไปที่หน้า</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-cream">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="grid gap-1">
              {STAFF_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  href={hrefOf(item.href)}
                  label={item.label}
                  hint={item.hint}
                  tone={item.tone}
                  icon={item.icon}
                  active={isActive(item.href)}
                />
              ))}
            </nav>
            <div className="mt-4 rounded-2xl bg-cream px-3 py-3">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-sm text-stone-500">
                {tenantName} · {branchName}
              </p>
              <div className="mt-2">{signOut}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavLink({
  href,
  label,
  hint,
  tone,
  icon,
  active,
}: {
  href: string;
  label: string;
  hint: string;
  tone: string;
  icon: keyof typeof ICONS;
  active: boolean;
}) {
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5",
        active ? "bg-cream" : "hover:bg-cream/70",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          TONE_CLASS[tone] ?? "bg-teal-100 text-teal-800",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-sm text-stone-500">{hint}</span>
      </span>
    </Link>
  );
}
