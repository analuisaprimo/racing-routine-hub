import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function GlassCard({
  className,
  children,
  strong = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { strong?: boolean; children?: ReactNode }) {
  return (
    <div className={cn(strong ? "glass-strong" : "glass", "p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CategoryDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]", className)}
      style={{ backgroundColor: color, color }}
    />
  );
}
