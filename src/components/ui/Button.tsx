import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 min-h-11 px-7";

const variants: Record<Variant, string> = {
  primary: "bg-foreground text-white hover:bg-accent",
  secondary:
    "border border-foreground text-foreground hover:bg-foreground hover:text-white",
  ghost: "text-foreground hover:text-accent px-0",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
});
