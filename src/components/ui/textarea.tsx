import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base outline-none",
        "placeholder:text-stone-400 focus:border-teal focus:ring-2 focus:ring-mint/30",
        className,
      )}
      {...props}
    />
  );
});
