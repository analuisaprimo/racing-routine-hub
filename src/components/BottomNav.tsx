import { Link, useRouterState } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  F1CheckeredFlag,
  F1Helmet,
  F1SteeringWheel,
  F1Podium,
  F1Tire,
} from "@/components/F1Icons";

type NavItem = { to: string; label: string; icon: React.ComponentType<any>; primary?: boolean };
const items: NavItem[] = [
  { to: "/hoje", label: "Hoje", icon: F1CheckeredFlag },
  { to: "/circuito", label: "Circuito", icon: F1SteeringWheel },
  { to: "/foco", label: "Foco", icon: F1SteeringWheel, primary: true },
  { to: "/estudos", label: "Estudos", icon: F1Helmet },
  { to: "/scuderia", label: "Scuderia", icon: F1Tire },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 px-3">
      <div className="glass-strong flex items-center gap-1 rounded-full px-2 py-1.5 shadow-[0_8px_32px_rgba(236,127,176,0.1)]">
        {items.map((it) => {
          const Icon = it.icon;
          const active = path.startsWith(it.to);
          if (it.primary) {
            return (
              <Link
                key={it.to}
                to={it.to as string}
                className={cn(
                  "mx-1 grid h-12 w-12 place-items-center rounded-full text-white",
                  "bg-[var(--racing)] shadow-[0_8px_24px_-6px_var(--racing)]",
                  "transition-transform active:scale-95"
                )}
                aria-label={it.label}
              >
                <Icon size={22} />
              </Link>
            );
          }
          return (
            <Link
              key={it.to}
              to={it.to as string}
              className={cn(
                "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                active ? "bg-white/20 text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground"
              )}
              aria-label={it.label}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{it.label}</span>
            </Link>
          );
        })}
        <Link
          to={"/telemetria" as string}
          className={cn(
            "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
            path.startsWith("/telemetria") ? "bg-white/20 text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground"
          )}
          aria-label="Telemetria"
        >
          <F1Podium size={18} />
        </Link>
        <Link
          to={"/ajustes" as string}
          className={cn(
            "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
            path.startsWith("/ajustes") ? "bg-white/20 text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground"
          )}
          aria-label="Ajustes"
        >
          <Settings className="h-4.5 w-4.5" />
        </Link>
      </div>
    </nav>
  );
}

