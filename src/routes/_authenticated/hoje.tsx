import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/Glass";
import { Gauge } from "@/components/Gauge";
import {
  CATEGORIA_COR,
  CATEGORIA_LABEL,
  saudacaoContextual,
  timeToMin,
  minToTime,
  type DiaSemana,
  type RoutineBlock,
  MATERIAS_ESCOLA_SEED,
  MATERIAS_DIFICULDADES,
  FRENTES_ENEM,
  FRENTES_UFMG,
  rotinaPadrao,
} from "@/lib/domain";
import { sugerirBlocos, totalPistaLivre, type SuggestedBlock } from "@/lib/scheduler";
import { Plus, Wrench, Edit2, Play, Check, Trash2, RotateCcw } from "lucide-react";
import {
  F1CheckeredFlag,
  F1Helmet,
  F1SteeringWheel,
  F1Podium,
  F1Tire,
  F1StartLights,
} from "@/components/F1Icons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hoje")({ component: Hoje });

function Hoje() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [timelineKey, setTimelineKey] = useState(0);
  const [activeTimeline, setActiveTimeline] = useState<any[]>([]);
  const [iniciandoBloco, setIniciandoBloco] = useState<any | null>(null);
  const [editandoBloco, setEditandoBloco] = useState<any | null>(null);

  // Relógio com precisão de 1 segundo para contagem regressiva
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
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
  const dateStr = useMemo(() => now.toISOString().slice(0, 10), [now]);

  // Carrega ou gera a timeline do dia atual
  useEffect(() => {
    if (!data) return;
    const saved = localStorage.getItem(`pit_calendar_${dateStr}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setActiveTimeline(parsed);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (data.subjects.length === 0 || data.routine.length === 0) {
      setActiveTimeline([]);
      return;
    }

    // Coleta o histórico dos últimos 6 dias
    const history: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const prevDate = new Date(now);
      prevDate.setDate(now.getDate() - i);
      const prevDateStr = prevDate.toISOString().slice(0, 10);
      const prevSaved = localStorage.getItem(`pit_calendar_${prevDateStr}`);
      if (prevSaved) {
        try {
          const parsed = JSON.parse(prevSaved);
          for (const b of parsed) {
            if (b.subject_id) history.push(b.subject_id);
          }
        } catch (e) {}
      }
    }

    const suggestions = sugerirBlocos({
      dia,
      routine: data.routine,
      pesos: {
        vestibular: data.profile?.peso_vestibular ?? 45,
        enem: data.profile?.peso_enem ?? 30,
        escola: data.profile?.peso_escola ?? 25,
      },
      subjects: data.subjects,
      scuderiaTasks: data.tasks,
      historySubjectIds: history,
    });

    const fixos = data.routine
      .filter((b) => b.dia_semana === dia && b.travado)
      .map((b) => ({
        id: `fixed-${b.inicio}-${Math.random()}`,
        dia_semana: dia,
        inicio: b.inicio,
        fim: b.fim,
        tipo: b.tipo,
        travado: true,
        label: b.label ?? CATEGORIA_LABEL[b.tipo],
        sugerido: false,
        categoria: b.tipo,
        duracao_min: timeToMin(b.fim) - timeToMin(b.inicio),
      }));

    const sugs = suggestions.map((s) => ({
      id: `suggest-${s.inicio}-${Math.random()}`,
      dia_semana: dia,
      inicio: s.inicio,
      fim: s.fim,
      tipo: s.categoria,
      travado: false,
      label: s.label,
      sugerido: true,
      categoria: s.categoria,
      subject_id: s.subject_id,
      concluido: false,
      duracao_min: s.duracao_min,
    }));

    const combined = [...fixos, ...sugs].sort((a, b) => timeToMin(a.inicio) - timeToMin(b.inicio));
    localStorage.setItem(`pit_calendar_${dateStr}`, JSON.stringify(combined));
    setActiveTimeline(combined);
  }, [data, dateStr, dia, now, timelineKey]);

  // Próxima volta (próximo bloco não concluído depois do horário atual)
  const proxima = useMemo(() => {
    return activeTimeline.find((b) => timeToMin(b.inicio) > minutosAgora - 5 && b.tipo !== "sono" && !b.concluido);
  }, [activeTimeline, minutosAgora]);

  const pistaLivre = data ? totalPistaLivre(dia, data.routine) : 0;
  const cumpridoMin = (data?.sessionsHoje ?? []).reduce((acc, s) => acc + s.duracao_min, 0);
  const metaMin = Math.max(60, Math.floor(pistaLivre * 0.6));
  const progresso = Math.min(1, metaMin > 0 ? cumpridoMin / metaMin : 0);

  const nome = data?.profile?.nome ?? "Piloto";

  // Sementes de dados caso estejam vazios
  async function carregarMateriasSeed() {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Sem usuário autenticado.");

      const subjects = [
        ...MATERIAS_ESCOLA_SEED.map((nome) => ({
          user_id: user.id,
          nome,
          categoria: "escola" as const,
          cor: "#C9A9E8",
          risco: MATERIAS_DIFICULDADES[nome] ?? 2,
        })),
        ...FRENTES_ENEM.map((nome) => ({
          user_id: user.id,
          nome,
          categoria: "enem" as const,
          cor: "#EC7FB0",
          risco: 2,
        })),
        ...FRENTES_UFMG.map((nome) => ({
          user_id: user.id,
          nome,
          categoria: "vestibular" as const,
          cor: "#B090DD",
          risco: 2,
        })),
      ];

      const { error } = await supabase.from("subjects").insert(subjects);
      if (error) throw error;

      toast.success("Grid preenchido! Matérias escolares e frentes cadastradas.");
      qc.invalidateQueries({ queryKey: ["hoje-data"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar matérias");
    }
  }

  async function carregarRotinaPadrao() {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Sem usuário autenticado.");

      const rotina = rotinaPadrao().map((b) => ({ ...b, user_id: user.id }));
      const { error } = await supabase.from("routine_blocks").insert(rotina);
      if (error) throw error;

      toast.success("Circuito semanal configurado!");
      qc.invalidateQueries({ queryKey: ["hoje-data"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar rotina");
    }
  }

  // Ações da Timeline
  async function toggleCompletar(bloco: any) {
    const updated = activeTimeline.map((b) => {
      if (b.id === bloco.id) {
        return { ...b, concluido: !b.concluido };
      }
      return b;
    });
    localStorage.setItem(`pit_calendar_${dateStr}`, JSON.stringify(updated));
    setActiveTimeline(updated);

    if (!bloco.concluido) {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        await supabase.from("study_sessions").insert({
          user_id: userRes.user!.id,
          subject_id: bloco.subject_id || null,
          duracao_min: bloco.duracao_min,
          tipo_ciclo: "manual",
          concluido: true,
          data: dateStr,
        });
        toast.success("🏁 Bloco concluído! Volta de estudos salva.");
        qc.invalidateQueries({ queryKey: ["hoje-data"] });
      } catch (e) {
        console.error(e);
      }
    } else {
      toast.info("Bloco desmarcado.");
    }
  }

  function excluirBloco(blocoId: string) {
    const updated = activeTimeline.filter((b) => b.id !== blocoId);
    localStorage.setItem(`pit_calendar_${dateStr}`, JSON.stringify(updated));
    setActiveTimeline(updated);
    toast.success("Bloco excluído.");
    setEditandoBloco(null);
  }

  function salvarEdicao(blocoId: string, novosDados: any) {
    const updated = activeTimeline.map((b) => {
      if (b.id === blocoId) {
        const dur = timeToMin(novosDados.fim) - timeToMin(novosDados.inicio);
        return {
          ...b,
          ...novosDados,
          duracao_min: dur > 0 ? dur : b.duracao_min,
          editado: true,
        };
      }
      return b;
    });
    localStorage.setItem(`pit_calendar_${dateStr}`, JSON.stringify(updated));
    setActiveTimeline(updated);
    toast.success("Bloco atualizado.");
    setEditandoBloco(null);
  }

  function estenderBloco(blocoId: string) {
    const updated = activeTimeline.map((b) => {
      if (b.id === blocoId) {
        const novoFimMin = timeToMin(b.fim) + 15;
        return {
          ...b,
          fim: minToTime(novoFimMin),
          duracao_min: b.duracao_min + 15,
          editado: true,
        };
      }
      return b;
    });
    localStorage.setItem(`pit_calendar_${dateStr}`, JSON.stringify(updated));
    setActiveTimeline(updated);
    toast.success("Estendido em +15 min.");
    if (editandoBloco) {
      setEditandoBloco({
        ...editandoBloco,
        fim: minToTime(timeToMin(editandoBloco.fim) + 15),
      });
    }
  }

  function dispararLargada(bloco: any) {
    setIniciandoBloco(bloco);
  }

  function concluirLargada() {
    if (iniciandoBloco) {
      localStorage.setItem("starting_subject_id", iniciandoBloco.subject_id || "");
      localStorage.setItem("starting_duration_min", String(iniciandoBloco.duracao_min || 45));
      setIniciandoBloco(null);
      nav({ to: "/foco" as string });
    }
  }

  function regenerarHoje() {
    localStorage.removeItem(`pit_calendar_${dateStr}`);
    setTimelineKey((k) => k + 1);
    toast.success("Cronograma recalculado!");
  }

  if (isLoading || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="glass px-6 py-4 flex flex-col items-center gap-3">
          <F1Tire className="animate-spin text-[var(--racing)]" size={32} />
          <span className="num-hud text-sm">Aquecendo motores…</span>
        </div>
      </div>
    );
  }

  // Estado guiado: faltam dados essenciais
  const showGuidedState = data.subjects.length === 0 || data.routine.length === 0;

  if (showGuidedState) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 pb-28">
        <div className="text-center">
          <div className="inline-grid h-20 w-20 place-items-center rounded-full bg-white/60 text-[var(--racing)] shadow-[0_12px_24px_rgba(236,127,176,0.15)] mb-6">
            <F1SteeringWheel size={42} />
          </div>
          <h1 className="text-3xl font-bold">Equipe fora do grid! 🏎️</h1>
          <p className="mt-3 text-sm opacity-80 leading-relaxed">
            Sua equipe de boxes precisa de mais informações para projetar o seu circuito diário de estudos. Calibre o setup inicial:
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <GlassCard className="flex flex-col md:flex-row items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Matérias da Escola</h3>
                <p className="text-xs opacity-60">Selecione suas matérias e pesos de dificuldade.</p>
              </div>
            </div>
            {data.subjects.length === 0 ? (
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={carregarMateriasSeed} className="flex-1 md:flex-initial text-xs bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-2 rounded-xl transition">
                  Seed (15 Matérias)
                </button>
                <Link to="/estudos" className="flex-1 md:flex-initial text-center text-xs bg-[var(--racing)] text-white px-3 py-2 rounded-xl transition">
                  Cadastrar
                </Link>
              </div>
            ) : (
              <Check className="text-[var(--flag)] h-5 w-5" />
            )}
          </GlassCard>

          <GlassCard className="flex flex-col md:flex-row items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Circuito da Rotina</h3>
                <p className="text-xs opacity-60">Adicione seus blocos de sono, escola e academia.</p>
              </div>
            </div>
            {data.routine.length === 0 ? (
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={carregarRotinaPadrao} className="flex-1 md:flex-initial text-xs bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-2 rounded-xl transition">
                  Setup Padrão
                </button>
                <Link to="/circuito" className="flex-1 md:flex-initial text-center text-xs bg-[var(--racing)] text-white px-3 py-2 rounded-xl transition">
                  Configurar
                </Link>
              </div>
            ) : (
              <Check className="text-[var(--flag)] h-5 w-5" />
            )}
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-28">
      {/* Transição de Semáforo de F1 */}
      <AnimatePresence>
        {iniciandoBloco && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/90 backdrop-blur-md"
          >
            <F1StartLights onComplete={concluirLargada} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <AnimatePresence>
        {editandoBloco && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="glass-strong w-full max-w-md p-6 space-y-4 shadow-[0_20px_40px_rgba(236,127,176,0.15)]"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Ajustar Bloco</h3>
                <button onClick={() => setEditandoBloco(null)} className="opacity-60 hover:opacity-100">✕</button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="opacity-70 text-xs font-semibold">Início</span>
                    <input
                      type="time"
                      value={editandoBloco.inicio}
                      onChange={(e) => setEditandoBloco({ ...editandoBloco, inicio: e.target.value })}
                      className="mt-1 w-full rounded-lg bg-black/10 border border-white/10 px-3 py-2 outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="opacity-70 text-xs font-semibold">Fim</span>
                    <input
                      type="time"
                      value={editandoBloco.fim}
                      onChange={(e) => setEditandoBloco({ ...editandoBloco, fim: e.target.value })}
                      className="mt-1 w-full rounded-lg bg-black/10 border border-white/10 px-3 py-2 outline-none"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="opacity-70 text-xs font-semibold">Matéria / Frente</span>
                  <select
                    value={editandoBloco.subject_id || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setEditandoBloco({
                          ...editandoBloco,
                          subject_id: undefined,
                          tipo: "boxes",
                          label: "Tempo de Boxes — respira",
                        });
                      } else {
                        const sub = data.subjects.find((s) => s.id === val);
                        setEditandoBloco({
                          ...editandoBloco,
                          subject_id: val,
                          tipo: sub.categoria,
                          label: sub.nome,
                        });
                      }
                    }}
                    className="mt-1 w-full rounded-lg bg-black/10 border border-white/10 px-3 py-2 outline-none"
                  >
                    <option value="">— Tempo de Boxes —</option>
                    {data.subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.nome} ({sub.categoria === "vestibular" ? "UFMG" : sub.categoria.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => estenderBloco(editandoBloco.id)}
                  className="flex-1 rounded-xl bg-white/20 border border-white/20 px-3 py-2.5 text-xs font-semibold transition active:scale-95"
                >
                  +15 min
                </button>
                <button
                  onClick={() => excluirBloco(editandoBloco.id)}
                  className="flex-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 px-3 py-2.5 text-xs font-semibold transition active:scale-95"
                >
                  Excluir
                </button>
              </div>

              <button
                onClick={() => salvarEdicao(editandoBloco.id, editandoBloco)}
                className="w-full rounded-xl bg-[var(--racing)] px-4 py-3 text-sm font-semibold text-white shadow-md active:scale-[0.98] transition"
              >
                Salvar Alterações
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] opacity-60">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
          <h1 className="mt-1 text-3xl font-bold">{saudacaoContextual(now.getHours(), nome)}</h1>
          <div className="mt-1 text-sm opacity-70 flex items-center gap-1.5">
            <F1Helmet size={14} className="text-[var(--racing)]" />
            {data.profile?.temporada_label}
          </div>
        </div>
        <div className="glass flex h-12 w-12 items-center justify-center rounded-2xl p-0">
          <F1Helmet size={24} className="text-[var(--racing)]" />
        </div>
      </div>

      {/* Próxima volta com cronômetro regressivo */}
      {proxima ? (
        <ProximaVoltaCard bloco={proxima} agoraDate={now} />
      ) : (
        <GlassCard strong className="mb-4 shadow-[0_8px_20px_rgba(236,127,176,0.06)] border border-white/50">
          <div className="text-sm opacity-70">Sem próxima volta programada</div>
          <div className="mt-1 text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
            Pista livre. Aproveite para respirar.
          </div>
        </GlassCard>
      )}

      {/* Combustível + Streak */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
        <GlassCard className="grid place-items-center shadow-[0_8px_20px_rgba(201,169,232,0.06)]">
          <Gauge
            value={progresso}
            label="Combustível do dia"
            sub={`${cumpridoMin}min / meta ${metaMin}min`}
          />
        </GlassCard>
        <div className="grid grid-rows-2 gap-4">
          <GlassCard className="shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60">Pista livre hoje</div>
                <div className="num-hud mt-1 text-3xl font-bold">
                  {Math.floor(pistaLivre / 60)}h{String(pistaLivre % 60).padStart(2, "0")}
                </div>
              </div>
              <F1SteeringWheel size={28} className="opacity-40 text-[var(--secondary)]" />
            </div>
          </GlassCard>
          <GlassCard className="shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60">Sequência de Foco</div>
                <div className="num-hud mt-1 text-3xl font-bold flex items-baseline gap-1">
                  {data.streak?.atual ?? 0}
                  <span className="text-sm font-normal opacity-60">corridas</span>
                </div>
              </div>
              <F1Podium size={28} className="opacity-40 text-[var(--secondary)]" />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <F1CheckeredFlag size={18} className="text-[var(--racing)]" />
            Circuito de Hoje
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={regenerarHoje}
              className="text-xs opacity-60 hover:opacity-100 flex items-center gap-1 border border-white/20 bg-white/5 px-2.5 py-1 rounded-lg transition"
            >
              <RotateCcw className="h-3 w-3" /> Recalcular dia
            </button>
            <Link
              to={"/circuito" as string}
              className="text-xs opacity-70 hover:opacity-100"
            >
              Ver semana →
            </Link>
          </div>
        </div>
        <div className="space-y-2.5">
          <AnimatePresence>
            {activeTimeline.length === 0 && (
              <GlassCard>
                <div className="text-sm opacity-70">A pista está livre.</div>
              </GlassCard>
            )}
            {activeTimeline.map((b, i) => {
              const passou = timeToMin(b.fim) < minutosAgora;
              const agora = timeToMin(b.inicio) <= minutosAgora && timeToMin(b.fim) > minutosAgora;
              const color = (CATEGORIA_COR as any)[b.tipo] ?? "#888";
              return (
                <motion.div
                  key={`${b.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: passou ? 0.5 : 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`glass flex items-center gap-3 p-3.5 shadow-sm transition-all ${
                    agora ? "ring-2 ring-[var(--racing)] scale-[1.01]" : ""
                  } ${b.concluido ? "bg-emerald-500/10 border-emerald-500/20" : ""}`}
                >
                  {/* Cor de Indentificação */}
                  <div
                    className="h-10 w-1.5 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                  />

                  {/* Detalhes do Bloco */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="num-hud text-sm font-semibold opacity-90">{b.inicio} - {b.fim}</span>
                      <span className="text-xs opacity-40">·</span>
                      <span className={`text-sm truncate font-medium ${b.concluido ? "line-through text-muted-foreground" : ""}`}>
                        {b.label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs opacity-60 flex items-center gap-1.5">
                      <span>{CATEGORIA_LABEL[b.tipo as keyof typeof CATEGORIA_LABEL] ?? b.tipo}</span>
                      {b.sugerido && <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--racing)] bg-[var(--racing)]/10 px-1.5 py-0.5 rounded-full">Sugerido</span>}
                      {!b.sugerido && b.travado && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded-full">Fixo</span>}
                      {b.editado && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Editado</span>}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5">
                    {/* Botão de Foco para bloco ativo */}
                    {agora && !b.concluido && !b.travado && (
                      <button
                        onClick={() => dispararLargada(b)}
                        className="rounded-full bg-[var(--racing)] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm flex items-center gap-1 hover:brightness-110 active:scale-95 transition"
                      >
                        <Play size={12} fill="currentColor" /> Largada
                      </button>
                    )}

                    {/* Controles para blocos editáveis */}
                    {!b.travado && (
                      <>
                        {/* Concluir */}
                        <button
                          onClick={() => toggleCompletar(b)}
                          className={`p-2 rounded-xl transition ${
                            b.concluido
                              ? "bg-emerald-500/20 text-emerald-600"
                              : "bg-black/5 hover:bg-black/10 text-foreground/70"
                          }`}
                          title={b.concluido ? "Desmarcar" : "Concluir"}
                        >
                          <Check size={14} className={b.concluido ? "stroke-[3px]" : ""} />
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => setEditandoBloco(b)}
                          className="p-2 rounded-xl bg-black/5 hover:bg-black/10 text-foreground/70 transition"
                          title="Ajustar Bloco"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Scuderia Box */}
      {data.tasks.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <F1Tire size={18} className="text-[var(--secondary)]" />
              Box da Scuderia
            </h2>
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
                  className={`glass p-3.5 shadow-sm border border-white/35 ${atrasada ? "ring-1 ring-red-300" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t.titulo}</div>
                      {t.prazo && (
                        <div className="text-xs opacity-60 mt-0.5">
                          Prazo: {new Date(t.prazo).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-md">
                      {t.status === "boxes" ? "A fazer" : "Em volta"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Add FAB */}
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
          else {
            toast.success("Tarefa registrada na scuderia! 🏎️");
            qc.invalidateQueries({ queryKey: ["hoje-data"] });
          }
        }}
        className="fixed bottom-24 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[var(--racing)] text-white shadow-[0_12px_30px_-6px_var(--racing)] hover:scale-105 active:scale-95 transition-transform"
        aria-label="Captura rápida"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

function ProximaVoltaCard({ bloco, agoraDate }: { bloco: any; agoraDate: Date }) {
  const [countdown, setCountdown] = useState("");

  const color = (CATEGORIA_COR as any)[bloco.tipo] ?? "#888";

  useEffect(() => {
    function update() {
      const [sh, sm] = bloco.inicio.split(":").map(Number);
      const target = new Date(agoraDate);
      target.setHours(sh, sm, 0, 0);

      const diff = target.getTime() - new Date().getTime();
      const diffSecs = Math.max(0, Math.floor(diff / 1000));

      if (diffSecs <= 0) {
        setCountdown("AGORA");
        return;
      }

      const h = Math.floor(diffSecs / 3600);
      const m = Math.floor((diffSecs % 3600) / 60);
      const s = diffSecs % 60;

      if (h > 0) {
        setCountdown(`${h}h ${String(m).padStart(2, "0")}m`);
      } else {
        setCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [bloco, agoraDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong mb-4 overflow-hidden p-5 relative shadow-[0_12px_24px_rgba(236,127,176,0.08)] border border-white/60"
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}
      />
      <div className="text-xs uppercase tracking-[0.22em] opacity-60 font-bold text-[var(--secondary)]">Próxima volta</div>
      <div className="mt-1.5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold text-slate-800">{bloco.label}</div>
          <div className="mt-1 text-sm opacity-70 font-medium">
            {CATEGORIA_LABEL[bloco.tipo as keyof typeof CATEGORIA_LABEL] ?? bloco.tipo} · {bloco.inicio} → {bloco.fim}
          </div>
        </div>
        <div className="text-right">
          <div className="num-hud text-4xl font-extrabold leading-none" style={{ color }}>
            {countdown}
          </div>
          <div className="text-[10px] uppercase tracking-widest opacity-60 font-bold">
            {countdown === "AGORA" ? "Na pista" : "Para a largada"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

