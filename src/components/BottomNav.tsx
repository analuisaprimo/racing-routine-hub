import { Link, useRouterState } from "@tanstack/react-router";
import { Flag, Calendar, BookOpen, Wrench, Timer, LineChart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/hoje", label: "Hoje", icon: Flag },
  { to: "/circuito", label: "Circuito", icon: Calendar },
  { to: "/foco", label: "Foco", icon: Timer, primary: true },
  { to: "/estudos", label: "Estudos", icon: BookOpen },
  { to: "/scuderia", label: "Scuderia", icon: Wrench },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 px-3">
      <div className="glass-strong flex items-center gap-1 rounded-full px-2 py-1.5">
        {items.map((it) => {
          const Icon = it.icon;
          const active = path.startsWith(it.to);
          if (it.primary) {
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "mx-1 grid h-12 w-12 place-items-center rounded-full text-racing-foreground",
                  "bg-[var(--racing)] shadow-[0_8px_24px_-6px_var(--racing)]",
                  "transition-transform active:scale-95"
                )}
                aria-label={it.label}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          }
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                active ? "bg-white/10 text-foreground" : "text-foreground/60 hover:text-foreground"
              )}
              aria-label={it.label}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{it.label}</span>
            </Link>
          );
        })}
        <Link
          to="/telemetria"
          className={cn(
            "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
            path.startsWith("/telemetria") ? "bg-white/10 text-foreground" : "text-foreground/60 hover:text-foreground"
          )}
        >
          <LineChart className="h-4 w-4" />
          <span className="hidden sm:inline">Telemetria</span>
        </Link>
        <Link
          to="/ajustes"
          className={cn(
            "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
            path.startsWith("/ajustes") ? "bg-white/10 text-foreground" : "text-foreground/60 hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}
