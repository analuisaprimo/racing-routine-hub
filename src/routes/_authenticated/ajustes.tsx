import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/Glass";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ajustes")({ component: Ajustes });

function Ajustes() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
      return data;
    },
  });

  const { data: prefs } = useQuery({
    queryKey: ["prefs"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("notification_prefs").select("*").eq("user_id", u.user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    nome: "",
    temporada_label: "",
    peso_vestibular: 45,
    peso_enem: 30,
    peso_escola: 25,
    academia_duracao_min: 60,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        nome: profile.nome ?? "Piloto",
        temporada_label: profile.temporada_label ?? "",
        peso_vestibular: profile.peso_vestibular ?? 45,
        peso_enem: profile.peso_enem ?? 30,
        peso_escola: profile.peso_escola ?? 25,
        academia_duracao_min: profile.academia_duracao_min ?? 60,
      });
    }
  }, [profile]);

  async function salvar() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update(form).eq("id", u.user!.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Setup atualizado.");
      qc.invalidateQueries();
    }
  }

  async function togglePref(k: string, v: boolean) {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("notification_prefs").update({ [k]: v } as any).eq("user_id", u.user!.id);
    qc.invalidateQueries({ queryKey: ["prefs"] });
  }

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth" as string, replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <h1 className="text-2xl">Ajustes</h1>

      <GlassCard className="mt-4 space-y-3">
        <h2 className="text-sm uppercase tracking-widest opacity-60">Piloto</h2>
        <label className="block text-sm">
          <span className="opacity-70">Nome</span>
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 outline-none ring-1 ring-white/10"
          />
        </label>
        <label className="block text-sm">
          <span className="opacity-70">Temporada</span>
          <input
            value={form.temporada_label}
            onChange={(e) => setForm({ ...form, temporada_label: e.target.value })}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 outline-none ring-1 ring-white/10"
          />
        </label>
        <label className="block text-sm">
          <span className="opacity-70">Duração academia (min)</span>
          <input
            type="number"
            value={form.academia_duracao_min}
            onChange={(e) => setForm({ ...form, academia_duracao_min: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 num-hud outline-none ring-1 ring-white/10"
          />
        </label>
      </GlassCard>

      <GlassCard className="mt-4 space-y-4">
        <h2 className="text-sm uppercase tracking-widest opacity-60">Setup de prioridades</h2>
        {(["peso_vestibular", "peso_enem", "peso_escola"] as const).map((k) => (
          <div key={k}>
            <div className="flex justify-between text-sm">
              <span>{k === "peso_vestibular" ? "UFMG" : k === "peso_enem" ? "ENEM" : "Escola"}</span>
              <span className="num-hud">{form[k]}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--racing)]"
            />
          </div>
        ))}
      </GlassCard>

      <GlassCard className="mt-4 space-y-3">
        <h2 className="text-sm uppercase tracking-widest opacity-60">Notificações</h2>
        {[
          ["aviso_bloco", "Aviso 10min antes do bloco"],
          ["aviso_scuderia", "Prazo da scuderia"],
          ["aviso_transicao", "Transição escola → scuderia → academia"],
          ["wind_down", "Wind-down às 21:30"],
          ["streak_risco", "Sequência em risco"],
          ["celebracao", "Bandeirada do dia"],
        ].map(([k, label]) => (
          <label key={k} className="flex items-center justify-between text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={(prefs as any)?.[k] ?? true}
              onChange={(e) => togglePref(k, e.target.checked)}
              className="h-5 w-5 accent-[var(--racing)]"
            />
          </label>
        ))}
      </GlassCard>

      <div className="mt-4 flex gap-2">
        <button onClick={salvar} className="flex-1 rounded-xl bg-[var(--racing)] px-4 py-3 text-sm font-semibold text-white">
          Salvar setup
        </button>
        <button onClick={sair} className="rounded-xl bg-white/10 px-4 py-3 text-sm">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
