import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base outline-none",
          "placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20",
          className,
        )}
        {...props}
      />
    );
  },
);
