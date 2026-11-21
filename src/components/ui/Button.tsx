import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Tone = "light" | "dark";

/** Classi del pulsante a capsula (core829.net): riusabili su <a>, <Link> e <button>. */
export function buttonClasses(variant: Variant = "primary", className?: string, tone: Tone = "light") {
  return cn("btn", `btn-${variant}`, tone === "dark" && "btn-on-dark", className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  tone?: Tone;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", tone = "light", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, className, tone)}
      {...props}
    />
  );
});
