import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIA_COR, CATEGORIA_LABEL, DIAS_NOMES, timeToMin, type DiaSemana, type RoutineBlock } from "@/lib/domain";
import { GlassCard } from "@/components/Glass";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/circuito")({ component: Circuito });

const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = END_HOUR - START_HOUR;

function Circuito() {
  const { data } = useQuery({
    queryKey: ["circuito"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("routine_blocks").select("*").eq("user_id", u.user!.id);
      return (data ?? []) as RoutineBlock[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6">
      <h1 className="text-2xl">Circuito da semana</h1>
      <p className="mt-1 text-sm opacity-70">Blocos travados aparecem sólidos. Espaços vazios são pista livre pra estudo.</p>

      <div className="mt-4 overflow-x-auto scrollbar-none">
        <div className="min-w-[720px]">
          <div className="mb-2 grid" style={{ gridTemplateColumns: `50px repeat(7, 1fr)` }}>
            <div />
            {DIAS_NOMES.map((d, i) => (
              <div key={d} className="text-center text-xs uppercase tracking-widest opacity-60">
                {d}
                {i === new Date().getDay() && <span className="ml-1 text-[var(--racing)]">•</span>}
              </div>
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: `50px repeat(7, 1fr)`, height: HOURS * 40 }}>
            {/* Horas */}
            <div className="relative">
              {Array.from({ length: HOURS + 1 }).map((_, i) => (
                <div key={i} className="num-hud absolute -translate-y-1/2 pr-2 text-right text-[10px] opacity-50" style={{ top: i * 40, right: 4 }}>
                  {String(START_HOUR + i).padStart(2, "0")}
                </div>
              ))}
            </div>
            {/* Colunas */}
            {Array.from({ length: 7 }).map((_, dia) => (
              <div key={dia} className="relative border-l border-white/5">
                {Array.from({ length: HOURS }).map((_, h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-white/5" style={{ top: h * 40 }} />
                ))}
                {(data ?? []).filter((b) => b.dia_semana === dia).map((b) => {
                  const iniMin = timeToMin(b.inicio) - START_HOUR * 60;
                  const fimMin = timeToMin(b.fim) - START_HOUR * 60;
                  if (fimMin <= 0 || iniMin >= HOURS * 60) return null;
                  const top = Math.max(0, (iniMin / 60) * 40);
                  const height = Math.max(14, ((Math.min(fimMin, HOURS * 60) - Math.max(0, iniMin)) / 60) * 40);
                  const color = CATEGORIA_COR[b.tipo] ?? "#888";
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-x-1 overflow-hidden rounded-md text-[10px] leading-tight"
                      style={{
                        top,
                        height,
                        background: `linear-gradient(180deg, color-mix(in oklab, ${color} 40%, transparent), color-mix(in oklab, ${color} 20%, transparent))`,
                        borderLeft: `2px solid ${color}`,
                        boxShadow: `0 4px 12px -6px ${color}`,
                      }}
                    >
                      <div className="p-1">
                        <div className="truncate font-medium">{b.label ?? CATEGORIA_LABEL[b.tipo]}</div>
                        {height > 30 && <div className="num-hud opacity-70">{b.inicio}</div>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <GlassCard className="mt-6 !p-4">
        <div className="flex flex-wrap gap-3 text-xs">
          {(Object.keys(CATEGORIA_LABEL) as (keyof typeof CATEGORIA_LABEL)[]).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORIA_COR[k], boxShadow: `0 0 8px ${CATEGORIA_COR[k]}` }} />
              <span className="opacity-80">{CATEGORIA_LABEL[k]}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
