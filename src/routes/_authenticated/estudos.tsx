import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { GlassCard } from "@/components/Glass";
import { CATEGORIA_COR } from "@/lib/domain";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/estudos")({ component: Estudos });

function Estudos() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"vestibular" | "enem" | "escola">("vestibular");
  const [novaMateria, setNovaMateria] = useState("");

  const { data } = useQuery({
    queryKey: ["estudos-data"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const [subjects, sessions] = await Promise.all([
        supabase.from("subjects").select("*").eq("user_id", u.user!.id).order("nome"),
        supabase
          .from("study_sessions")
          .select("subject_id, duracao_min, data")
          .eq("user_id", u.user!.id)
          .gte("data", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
      ]);
      return { subjects: subjects.data ?? [], sessions: sessions.data ?? [] };
    },
  });

  const progresso = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of data?.sessions ?? []) {
      if (!s.subject_id) continue;
      map.set(s.subject_id, (map.get(s.subject_id) ?? 0) + s.duracao_min);
    }
    return map;
  }, [data]);

  const filtradas = (data?.subjects ?? []).filter((s) => s.categoria === tab);

  async function adicionar() {
    if (!novaMateria.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("subjects").insert({
      user_id: u.user!.id,
      nome: novaMateria.trim(),
      categoria: tab,
    });
    setNovaMateria("");
    qc.invalidateQueries({ queryKey: ["estudos-data"] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <h1 className="text-2xl">Planejador de estudos</h1>
      <p className="mt-1 text-sm opacity-70">Progresso semanal por frente. Meta padrão: 60 min/matéria.</p>

      <div className="mt-4 flex gap-2">
        {(["vestibular", "enem", "escola"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition ${
              tab === k ? "bg-white/15" : "bg-white/5 opacity-70"
            }`}
          >
            {k === "vestibular" ? "UFMG" : k === "enem" ? "ENEM" : "Escola"}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {filtradas.map((s, i) => {
          const min = progresso.get(s.id) ?? 0;
          const meta = s.meta_semanal_min ?? 60;
          const pct = Math.min(1, min / meta);
          const color = CATEGORIA_COR[s.categoria as keyof typeof CATEGORIA_COR];
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <GlassCard className="!p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{s.nome}</div>
                    <div className="text-xs opacity-60">
                      Risco {s.risco === 1 ? "baixo" : s.risco === 2 ? "médio" : "alto"}
                      {s.prova_proxima && ` · prova ${new Date(s.prova_proxima).toLocaleDateString("pt-BR")}`}
                    </div>
                  </div>
                  <div className="num-hud text-sm opacity-80">
                    {min}<span className="opacity-50">/{meta}m</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct * 100}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                  />
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <div className="glass mt-4 flex gap-2 p-3">
        <input
          value={novaMateria}
          onChange={(e) => setNovaMateria(e.target.value)}
          placeholder={`Nova matéria em ${tab === "vestibular" ? "UFMG" : tab.toUpperCase()}`}
          className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
        />
        <button onClick={adicionar} className="rounded-lg bg-[var(--racing)] px-4 text-sm font-semibold text-white">
          +
        </button>
      </div>
    </div>
  );
}
