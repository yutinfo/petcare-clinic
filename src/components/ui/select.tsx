import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none",
        "focus:border-teal focus:ring-2 focus:ring-mint/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
