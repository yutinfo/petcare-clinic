import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors touch-manipulation disabled:pointer-events-none disabled:bg-stone-200 disabled:text-stone-600 disabled:opacity-100 disabled:shadow-none",
  {
    variants: {
      variant: {
        default: "bg-teal text-white hover:bg-teal-deep shadow-sm",
        coral: "bg-coral text-white hover:bg-orange-600 shadow-sm",
        outline: "border border-stone-200 bg-white text-ink hover:bg-sand/60",
        ghost: "hover:bg-sand/70 text-ink",
        sun: "bg-sun text-ink hover:bg-amber-500 shadow-sm",
      },
      size: {
        default: "h-11 min-w-11 px-4",
        sm: "h-9 px-3",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
