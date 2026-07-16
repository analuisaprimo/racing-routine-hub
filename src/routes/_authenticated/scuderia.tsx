import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/Glass";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scuderia")({ component: Scuderia });

const COLUNAS = [
  { key: "boxes", label: "Nos boxes", cor: "var(--color-muted-foreground)" },
  { key: "volta", label: "Em volta", cor: "var(--amber)" },
  { key: "bandeirada", label: "Bandeirada", cor: "var(--flag)" },
] as const;

function Scuderia() {
  const qc = useQueryClient();
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoPrazo, setNovoPrazo] = useState("");
  const [sobrouOficina, setSobrouOficina] = useState(false);

  const { data } = useQuery({
    queryKey: ["scuderia"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("scuderia_tasks")
        .select("*")
        .eq("user_id", u.user!.id)
        .order("prazo", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  async function criar() {
    if (!novoTitulo.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("scuderia_tasks").insert({
      user_id: u.user!.id,
      titulo: novoTitulo.trim(),
      prazo: novoPrazo || null,
      sobrou_oficina: sobrouOficina,
    });
    if (error) toast.error(error.message);
    else {
      setNovoTitulo(""); setNovoPrazo(""); setSobrouOficina(false);
      qc.invalidateQueries({ queryKey: ["scuderia"] });
    }
  }

  async function mover(id: string, status: string) {
    await supabase.from("scuderia_tasks").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["scuderia"] });
    if (status === "bandeirada") toast.success("🏁 Bandeirada!");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6">
      <h1 className="text-2xl">Box da Scuderia</h1>
      <p className="mt-1 text-sm opacity-70">Tarefas da equipe de racing. O que sobrou da oficina entra no seu tempo livre.</p>

      <div className="glass mt-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            placeholder="Nova tarefa"
            className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
          />
          <input
            type="date"
            value={novoPrazo}
            onChange={(e) => setNovoPrazo(e.target.value)}
            className="rounded-lg bg-black/30 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
          />
          <button onClick={criar} className="rounded-lg bg-[var(--racing)] px-4 py-2 text-sm font-semibold text-white">
            Adicionar
          </button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs opacity-80">
          <input type="checkbox" checked={sobrouOficina} onChange={(e) => setSobrouOficina(e.target.checked)} />
          Sobrou da oficina (não deu tempo no horário presencial)
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {COLUNAS.map((col) => {
          const items = (data ?? []).filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.cor, boxShadow: `0 0 8px ${col.cor}` }} />
                  <h2 className="text-sm uppercase tracking-widest opacity-80">{col.label}</h2>
                </div>
                <span className="num-hud text-xs opacity-60">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <GlassCard className="!p-4 text-xs opacity-60">Vazio.</GlassCard>
              ) : items.map((t) => {
                const atrasada = t.prazo && new Date(t.prazo) < new Date() && t.status !== "bandeirada";
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass p-3 ${atrasada ? "ring-1 ring-[var(--racing)]" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {atrasada && <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--racing)]" />}
                      {t.sobrou_oficina && (
                        <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--amber)]">Oficina</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{t.titulo}</div>
                        {t.prazo && (
                          <div className="mt-0.5 text-xs opacity-60">
                            {new Date(t.prazo).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {COLUNAS.filter((c) => c.key !== t.status).map((c) => (
                        <button
                          key={c.key}
                          onClick={() => mover(t.id, c.key)}
                          className="rounded-md bg-white/5 px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-white/10"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
