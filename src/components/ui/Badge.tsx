import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  tone?: "red" | "outline" | "surface";
}

export default function Badge({ children, className, tone = "red" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em]",
        tone === "red" && "border border-accent/30 bg-accent/5 text-accent",
        tone === "outline" && "border border-foreground/20 text-foreground-muted",
        tone === "surface" && "bg-surface text-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
