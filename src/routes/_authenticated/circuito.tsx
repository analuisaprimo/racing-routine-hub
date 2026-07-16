import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIA_COR,
  CATEGORIA_LABEL,
  timeToMin,
  minToTime,
  type DiaSemana,
  type RoutineBlock,
} from "@/lib/domain";
import { sugerirBlocos } from "@/lib/scheduler";
import { GlassCard } from "@/components/Glass";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { F1SteeringWheel, F1CheckeredFlag, F1Helmet } from "@/components/F1Icons";
import { RotateCcw, Check, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/circuito")({ component: Circuito });

const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = END_HOUR - START_HOUR;

function getWeekDates(currentDate: Date): { date: Date; dateStr: string; label: string }[] {
  const dates: { date: Date; dateStr: string; label: string }[] = [];
  const currentDay = currentDate.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab
  // Ajusta para começar na segunda-feira
  const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;

  for (let i = 0; i < 7; i++) {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + mondayDiff + i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
    dates.push({ date: d, dateStr, label });
  }
  return dates;
}

function Circuito() {
  const qc = useQueryClient();
  const [weekKey, setWeekKey] = useState(0);
  const [editandoBloco, setEditandoBloco] = useState<any | null>(null);

  const weekDates = useMemo(() => getWeekDates(new Date()), [weekKey]);

  // Carrega todos os dados idênticos ao dashboard Hoje para usar no agendador
  const { data: queryData, isLoading } = useQuery({
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

  // Monta o cronograma semanal mesclando dados e salvando/lendo de localStorage
  const weeklySchedule = useMemo(() => {
    if (!queryData) return {};
    const schedule: Record<string, any[]> = {};

    for (const { dateStr, date } of weekDates) {
      const dia = date.getDay() as DiaSemana;
      const saved = localStorage.getItem(`pit_calendar_${dateStr}`);
      if (saved) {
        try {
          schedule[dateStr] = JSON.parse(saved);
          continue;
        } catch (e) {}
      }

      if (queryData.subjects.length === 0 || queryData.routine.length === 0) {
        schedule[dateStr] = [];
        continue;
      }

      // Histórico dos 6 dias anteriores a essa data
      const history: string[] = [];
      for (let i = 1; i <= 6; i++) {
        const prevDate = new Date(date);
        prevDate.setDate(date.getDate() - i);
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
        routine: queryData.routine,
        pesos: {
          vestibular: queryData.profile?.peso_vestibular ?? 45,
          enem: queryData.profile?.peso_enem ?? 30,
          escola: queryData.profile?.peso_escola ?? 25,
        },
        subjects: queryData.subjects,
        scuderiaTasks: queryData.tasks,
        historySubjectIds: history,
      });

      const fixos = queryData.routine
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
      schedule[dateStr] = combined;
    }

    return schedule;
  }, [queryData, weekDates]);

  // Ações de Edição
  function salvarEdicao(dateStr: string, blocoId: string, novosDados: any) {
    const dayBlocks = weeklySchedule[dateStr] ?? [];
    const updated = dayBlocks.map((b) => {
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
    setWeekKey((k) => k + 1);
    qc.invalidateQueries({ queryKey: ["hoje-data"] });
    toast.success("Bloco atualizado!");
    setEditandoBloco(null);
  }

  function excluirBloco(dateStr: string, blocoId: string) {
    const dayBlocks = weeklySchedule[dateStr] ?? [];
    const updated = dayBlocks.filter((b) => b.id !== blocoId);

    localStorage.setItem(`pit_calendar_${dateStr}`, JSON.stringify(updated));
    setWeekKey((k) => k + 1);
    qc.invalidateQueries({ queryKey: ["hoje-data"] });
    toast.success("Bloco excluído.");
    setEditandoBloco(null);
  }

  function estenderBloco(dateStr: string, blocoId: string) {
    const dayBlocks = weeklySchedule[dateStr] ?? [];
    const updated = dayBlocks.map((b) => {
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
    setWeekKey((k) => k + 1);
    qc.invalidateQueries({ queryKey: ["hoje-data"] });
    toast.success("Estendido em +15 min.");
    if (editandoBloco) {
      setEditandoBloco({
        ...editandoBloco,
        fim: minToTime(timeToMin(editandoBloco.fim) + 15),
      });
    }
  }

  function toggleCompletar(dateStr: string, bloco: any) {
    const dayBlocks = weeklySchedule[dateStr] ?? [];
    const updated = dayBlocks.map((b) => {
      if (b.id === bloco.id) {
        return { ...b, concluido: !b.concluido };
      }
      return b;
    });

    localStorage.setItem(`pit_calendar_${dateStr}`, JSON.stringify(updated));
    setWeekKey((k) => k + 1);

    if (!bloco.concluido) {
      supabase.auth.getUser().then(async ({ data: userRes }) => {
        await supabase.from("study_sessions").insert({
          user_id: userRes.user!.id,
          subject_id: bloco.subject_id || null,
          duracao_min: bloco.duracao_min,
          tipo_ciclo: "manual",
          concluido: true,
          data: dateStr,
        });
        qc.invalidateQueries({ queryKey: ["hoje-data"] });
        toast.success("🏁 Bloco concluído!");
      });
    } else {
      toast.info("Bloco desmarcado.");
    }
  }

  function forcarRegeracaoSemana() {
    for (const { dateStr } of weekDates) {
      localStorage.removeItem(`pit_calendar_${dateStr}`);
    }
    setWeekKey((k) => k + 1);
    qc.invalidateQueries({ queryKey: ["hoje-data"] });
    toast.success("Calendário da semana gerado com as regras!");
  }

  if (isLoading || !queryData) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="glass px-6 py-4 flex flex-col items-center gap-3">
          <F1SteeringWheel className="animate-spin text-[var(--racing)]" size={32} />
          <span className="num-hud text-sm">Carregando telemetria...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <F1SteeringWheel size={24} className="text-[var(--racing)] animate-pulse-soft" />
            Calendário Semanal
          </h1>
          <p className="mt-1 text-xs opacity-70">Estruturado de forma automática. Clique nos blocos de estudos para editá-los.</p>
        </div>

        <button
          onClick={forcarRegeracaoSemana}
          className="text-xs bg-white/20 border border-white/20 px-3.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5 hover:bg-white/35 active:scale-95 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Gerar calendário da semana
        </button>
      </div>

      {/* Grade Semanal */}
      <div className="overflow-x-auto scrollbar-none rounded-3xl border border-white/30 bg-white/10 shadow-sm p-4">
        <div className="min-w-[900px]">
          {/* Cabeçalho de dias */}
          <div className="mb-3 grid" style={{ gridTemplateColumns: `55px repeat(7, 1fr)`, gap: "8px" }}>
            <div />
            {weekDates.map(({ label, dateStr }) => {
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={dateStr}
                  className={`text-center text-xs uppercase tracking-widest py-1.5 rounded-lg ${
                    isToday ? "bg-[var(--racing)]/10 text-[var(--racing)] font-bold border border-[var(--racing)]/30" : "opacity-60"
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Timeline da grade */}
          <div className="relative grid" style={{ gridTemplateColumns: `55px repeat(7, 1fr)`, height: HOURS * 40, gap: "8px" }}>
            {/* Horas na esquerda */}
            <div className="relative">
              {Array.from({ length: HOURS + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="num-hud absolute -translate-y-1/2 pr-2 text-right text-[10px] opacity-60 font-semibold text-slate-500"
                  style={{ top: i * 40, right: 8 }}
                >
                  {String(START_HOUR + i).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {weekDates.map(({ dateStr }) => {
              const dayBlocks = weeklySchedule[dateStr] ?? [];
              return (
                <div key={dateStr} className="relative bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-inner">
                  {Array.from({ length: HOURS }).map((_, h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-black/[0.03]" style={{ top: h * 40 }} />
                  ))}

                  {dayBlocks.map((b, i) => {
                    const iniMin = timeToMin(b.inicio) - START_HOUR * 60;
                    const fimMin = timeToMin(b.fim) - START_HOUR * 60;
                    if (fimMin <= 0 || iniMin >= HOURS * 60) return null;
                    const top = Math.max(0, (iniMin / 60) * 40);
                    const height = Math.max(16, ((Math.min(fimMin, HOURS * 60) - Math.max(0, iniMin)) / 60) * 40);
                    const color = CATEGORIA_COR[b.tipo as keyof typeof CATEGORIA_COR] ?? "#888";
                    return (
                      <motion.button
                        key={`${b.id}-${i}`}
                        onClick={() => {
                          if (!b.travado) {
                            setEditandoBloco({ ...b, dateStr });
                          } else {
                            toast.info("Blocos fixos da rotina não podem ser editados.");
                          }
                        }}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-x-0.5 overflow-hidden rounded-lg text-[9px] leading-tight text-left select-none transition hover:brightness-95 active:scale-[0.97]"
                        style={{
                          top,
                          height,
                          background: b.concluido
                            ? `linear-gradient(180deg, rgba(94, 209, 151, 0.25), rgba(94, 209, 151, 0.15))`
                            : `linear-gradient(180deg, color-mix(in oklab, ${color} 25%, transparent), color-mix(in oklab, ${color} 12%, transparent))`,
                          borderLeft: b.concluido ? `3px solid var(--flag)` : `3px solid ${color}`,
                          boxShadow: b.concluido
                            ? `0 2px 6px rgba(94, 209, 151, 0.1)`
                            : `0 4px 12px -6px ${color}`,
                        }}
                      >
                        <div className="p-1 h-full flex flex-col justify-between">
                          <div>
                            <div className="truncate font-bold text-slate-800">{b.label}</div>
                            <div className="num-hud opacity-70 text-[8px] font-semibold text-slate-500">{b.inicio} - {b.fim}</div>
                          </div>
                          {b.concluido && height > 24 && (
                            <div className="text-right text-[8px]">🏁</div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor Modal do Bloco da Semana */}
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
                <div>
                  <h3 className="text-lg font-bold">Editar Bloco de Estudo</h3>
                  <p className="text-[10px] opacity-60">
                    Dia: {new Date(editandoBloco.dateStr + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
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
                        const sub = queryData.subjects.find((s) => s.id === val);
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
                    {queryData.subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.nome} ({sub.categoria === "vestibular" ? "UFMG" : sub.categoria.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => estenderBloco(editandoBloco.dateStr, editandoBloco.id)}
                  className="flex-1 rounded-xl bg-white/20 border border-white/20 px-3 py-2.5 text-xs font-bold transition active:scale-95"
                >
                  +15 min
                </button>
                <button
                  onClick={() => toggleCompletar(editandoBloco.dateStr, editandoBloco)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold border transition active:scale-95 ${
                    editandoBloco.concluido
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                      : "bg-white/20 border-white/20"
                  }`}
                >
                  {editandoBloco.concluido ? "✓ Concluído" : "Marcar Concluído"}
                </button>
                <button
                  onClick={() => excluirBloco(editandoBloco.dateStr, editandoBloco.id)}
                  className="flex-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 px-3 py-2.5 text-xs font-bold transition active:scale-95"
                >
                  Excluir
                </button>
              </div>

              <button
                onClick={() => salvarEdicao(editandoBloco.dateStr, editandoBloco.id, editandoBloco)}
                className="w-full rounded-xl bg-[var(--racing)] px-4 py-3 text-sm font-bold text-white shadow-md active:scale-[0.98] transition"
              >
                Salvar Alterações
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

