import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/Glass";
import { Gauge } from "@/components/Gauge";
import {
  CATEGORIA_COR,
  CATEGORIA_LABEL,
  saudacaoContextual,
  timeToMin,
  type DiaSemana,
  type RoutineBlock,
} from "@/lib/domain";
import { sugerirBlocos, totalPistaLivre, type SuggestedBlock } from "@/lib/scheduler";
import { Flag, Plus, Wrench, Timer, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hoje")({ component: Hoje });

function Hoje() {
  const nav = useNavigate();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["hoje-data"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user!;
      const [prof, blocks, subjects, tasks, streak, sessions] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("routine_blocks").select("*").eq("user_id", user.id),
        supabase.from("subjects").select("*").eq("user_id", user.id),
        supabase.from("scuderia_tasks").select("*").eq("user_id", user.id).neq("status", "bandeirada").order("prazo", { ascending: true, nullsFirst: false }),
        supabase.from("streaks").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("study_sessions")
          .select("duracao_min")
          .eq("user_id", user.id)
          .eq("data", new Date().toISOString().slice(0, 10)),
      ]);
      return {
        profile: prof.data,
        routine: (blocks.data ?? []) as RoutineBlock[],
        subjects: subjects.data ?? [],
        tasks: tasks.data ?? [],
        streak: streak.data,
        sessionsHoje: sessions.data ?? [],
      };
    },
  });

  useEffect(() => {
    if (data && data.profile && !data.profile.onboarding_completo) {
      nav({ to: "/onboarding" as string });
    }
  }, [data, nav]);

  const dia = now.getDay() as DiaSemana;
  const minutosAgora = now.getHours() * 60 + now.getMinutes();

  const sugestoes: SuggestedBlock[] = useMemo(() => {
    if (!data) return [];
    const subjectsPorCategoria = {
      escola: [],
      enem: [],
      vestibular: [],
      scuderia: [],
    } as Record<string, { id: string; nome: string; risco: number; diasAteProva?: number }[]>;
    for (const s of data.subjects) {
      const cat = s.categoria as keyof typeof subjectsPorCategoria;
      const diasAteProva = s.prova_proxima
        ? Math.max(0, Math.floor((new Date(s.prova_proxima).getTime() - Date.now()) / 86400000))
        : undefined;
      subjectsPorCategoria[cat].push({ id: s.id, nome: s.nome, risco: s.risco, diasAteProva });
    }
    return sugerirBlocos({
      dia,
      routine: data.routine,
      pesos: {
        vestibular: data.profile?.peso_vestibular ?? 45,
        enem: data.profile?.peso_enem ?? 30,
        escola: data.profile?.peso_escola ?? 25,
      },
      subjectsPorCategoria: subjectsPorCategoria as any,
      scuderiaPendentes: (data.tasks ?? []).length,
    });
  }, [data, dia]);

  // Timeline: mescla travados + sugeridos
  const timeline = useMemo(() => {
    if (!data) return [];
    const fixos = data.routine
      .filter((b) => b.dia_semana === dia && b.travado)
      .map((b) => ({ ...b, sugerido: false as const }));
    const sugs = sugestoes.map((s) => ({
      dia_semana: dia,
      inicio: s.inicio,
      fim: s.fim,
      tipo: s.categoria as any,
      travado: false,
      label: s.label,
      sugerido: true as const,
      categoria: s.categoria,
    }));
    return [...fixos, ...sugs].sort((a, b) => timeToMin(a.inicio) - timeToMin(b.inicio));
  }, [data, sugestoes, dia]);

  // Próxima "volta" = próximo bloco livre/sugerido depois de agora
  const proxima = useMemo(() => {
    return timeline.find((b) => timeToMin(b.inicio) > minutosAgora - 5 && b.tipo !== "sono");
  }, [timeline, minutosAgora]);

  const pistaLivre = data ? totalPistaLivre(dia, data.routine) : 0;
  const cumpridoMin = (data?.sessionsHoje ?? []).reduce((acc, s) => acc + s.duracao_min, 0);
  const metaMin = Math.max(60, Math.floor(pistaLivre * 0.6));
  const progresso = Math.min(1, metaMin > 0 ? cumpridoMin / metaMin : 0);

  const nome = data?.profile?.nome ?? "Piloto";

  if (isLoading || !data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="glass px-6 py-4 num-hud">Aquecendo motores…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] opacity-60">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
          <h1 className="mt-1 text-3xl">{saudacaoContextual(now.getHours(), nome)}</h1>
          <div className="mt-1 text-sm opacity-70">{data.profile?.temporada_label}</div>
        </div>
        <div className="glass grid h-12 w-12 place-items-center rounded-2xl p-0">
          <Flag className="h-5 w-5" />
        </div>
      </div>

      {/* Próxima volta */}
      {proxima ? (
        <ProximaVoltaCard bloco={proxima} agora={minutosAgora} />
      ) : (
        <GlassCard strong className="mb-4">
          <div className="text-sm opacity-70">Sem próxima volta programada</div>
          <div className="mt-1 text-xl">Pista livre. Aproveita pra respirar.</div>
        </GlassCard>
      )}

      {/* Combustível + Streak */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
        <GlassCard className="grid place-items-center">
          <Gauge
            value={progresso}
            label="Combustível do dia"
            sub={`${cumpridoMin}min / meta ${metaMin}min`}
          />
        </GlassCard>
        <div className="grid grid-rows-2 gap-4">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60">Pista livre hoje</div>
                <div className="num-hud mt-1 text-3xl">
                  {Math.floor(pistaLivre / 60)}h{String(pistaLivre % 60).padStart(2, "0")}
                </div>
              </div>
              <Timer className="h-6 w-6 opacity-50" />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60">Sequência</div>
                <div className="num-hud mt-1 text-3xl flex items-baseline gap-1">
                  {data.streak?.atual ?? 0}
                  <span className="text-sm opacity-60">corridas</span>
                </div>
              </div>
              <div className="text-2xl">🏁</div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg">Circuito de hoje</h2>
          <Link
            to={"/circuito" as string}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Ver semana →
          </Link>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {timeline.length === 0 && (
              <GlassCard>
                <div className="text-sm opacity-70">A pista está livre. Bora largar sua primeira volta?</div>
              </GlassCard>
            )}
            {timeline.map((b, i) => {
              const passou = timeToMin(b.fim) < minutosAgora;
              const agora = timeToMin(b.inicio) <= minutosAgora && timeToMin(b.fim) > minutosAgora;
              const color = (CATEGORIA_COR as any)[b.tipo] ?? "#888";
              return (
                <motion.div
                  key={`${b.inicio}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: passou ? 0.4 : 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`glass flex items-center gap-3 p-3 ${agora ? "ring-2 ring-[var(--racing)]" : ""}`}
                >
                  <div
                    className="h-10 w-1.5 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="num-hud text-sm opacity-80">{b.inicio}</span>
                      <span className="text-xs opacity-40">·</span>
                      <span className="text-sm truncate">{b.label ?? CATEGORIA_LABEL[b.tipo as keyof typeof CATEGORIA_LABEL] ?? b.tipo}</span>
                    </div>
                    <div className="mt-0.5 text-xs opacity-60">
                      {CATEGORIA_LABEL[b.tipo as keyof typeof CATEGORIA_LABEL] ?? b.tipo}
                      {b.sugerido && <span className="ml-2 text-[10px] uppercase tracking-widest text-[var(--flag)]">Sugerido</span>}
                      {!b.sugerido && b.travado && <span className="ml-2 text-[10px] uppercase tracking-widest opacity-50">Fixo</span>}
                    </div>
                  </div>
                  {agora && (
                    <button
                      onClick={() => nav({ to: "/foco" as string })}
                      className="rounded-full bg-[var(--racing)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Iniciar
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Scuderia pendências */}
      {data.tasks.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg flex items-center gap-2"><Wrench className="h-4 w-4" /> Box da Scuderia</h2>
            <Link to={"/scuderia" as string} className="text-xs opacity-70 hover:opacity-100">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {data.tasks.slice(0, 3).map((t) => {
              const atrasada = t.prazo && new Date(t.prazo) < new Date();
              return (
                <div
                  key={t.id}
                  className={`glass p-3 ${atrasada ? "ring-1 ring-[var(--racing)]" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {atrasada && <AlertCircle className="h-4 w-4 text-[var(--racing)]" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{t.titulo}</div>
                      {t.prazo && (
                        <div className="text-xs opacity-60">
                          Prazo: {new Date(t.prazo).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">
                      {t.status === "boxes" ? "A fazer" : "Em volta"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={async () => {
          const titulo = prompt("Nova tarefa da scuderia?");
          if (!titulo) return;
          const { data: userRes } = await supabase.auth.getUser();
          const { error } = await supabase.from("scuderia_tasks").insert({
            user_id: userRes.user!.id,
            titulo,
          });
          if (error) toast.error(error.message);
          else toast.success("Tarefa entrou no box.");
        }}
        className="fixed bottom-24 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[var(--racing)] text-white shadow-[0_20px_40px_-10px_var(--racing)] transition active:scale-95"
        aria-label="Captura rápida"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

function ProximaVoltaCard({ bloco, agora }: { bloco: any; agora: number }) {
  const inicioMin = timeToMin(bloco.inicio);
  const emMin = inicioMin - agora;
  const color = (CATEGORIA_COR as any)[bloco.tipo] ?? "#888";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong mb-4 overflow-hidden p-5 relative"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}
      />
      <div className="text-xs uppercase tracking-[0.22em] opacity-60">Próxima volta</div>
      <div className="mt-1 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-2xl">{bloco.label ?? CATEGORIA_LABEL[bloco.tipo as keyof typeof CATEGORIA_LABEL] ?? bloco.tipo}</div>
          <div className="mt-1 text-sm opacity-70">
            {CATEGORIA_LABEL[bloco.tipo as keyof typeof CATEGORIA_LABEL] ?? bloco.tipo} · {bloco.inicio} → {bloco.fim}
          </div>
        </div>
        <div className="text-right">
          <div className="num-hud text-4xl leading-none" style={{ color }}>
            {emMin <= 0 ? "AGORA" : `${emMin}m`}
          </div>
          <div className="text-xs uppercase tracking-widest opacity-60">
            {emMin <= 0 ? "na pista" : "pra largada"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
