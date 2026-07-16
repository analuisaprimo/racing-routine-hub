import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/Glass";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { CATEGORIA_COR } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/telemetria")({ component: Telemetria });

function Telemetria() {
  const { data } = useQuery({
    queryKey: ["telemetria"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const semanaAtras = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
      const [sessions, subjects, streak] = await Promise.all([
        supabase.from("study_sessions").select("*").eq("user_id", u.user!.id).gte("data", semanaAtras),
        supabase.from("subjects").select("id, nome, categoria").eq("user_id", u.user!.id),
        supabase.from("streaks").select("*").eq("user_id", u.user!.id).maybeSingle(),
      ]);
      return { sessions: sessions.data ?? [], subjects: subjects.data ?? [], streak: streak.data };
    },
  });

  const subjectCat = new Map((data?.subjects ?? []).map((s) => [s.id, s.categoria]));
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  const chartData = days.map((d) => {
    const dayLabel = new Date(d).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const row: any = { dia: dayLabel };
    for (const s of data?.sessions ?? []) {
      if (s.data !== d) continue;
      const cat = subjectCat.get(s.subject_id ?? "") ?? "escola";
      row[cat] = (row[cat] ?? 0) + s.duracao_min;
    }
    return row;
  });

  const totalPorCategoria: Record<string, number> = {};
  for (const s of data?.sessions ?? []) {
    const cat = subjectCat.get(s.subject_id ?? "") ?? "escola";
    totalPorCategoria[cat] = (totalPorCategoria[cat] ?? 0) + s.duracao_min;
  }
  const podio = Object.entries(totalPorCategoria).sort((a, b) => b[1] - a[1]);

  const semAtual = (data?.sessions ?? []).filter((s) => new Date(s.data).getTime() >= Date.now() - 7 * 86400000)
    .reduce((a, s) => a + s.duracao_min, 0);
  const semAnterior = (data?.sessions ?? []).filter((s) => {
    const t = new Date(s.data).getTime();
    return t >= Date.now() - 14 * 86400000 && t < Date.now() - 7 * 86400000;
  }).reduce((a, s) => a + s.duracao_min, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <h1 className="text-2xl">Telemetria</h1>
      <p className="mt-1 text-sm opacity-70">Sua temporada em números.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <GlassCard className="!p-4">
          <div className="text-xs uppercase tracking-widest opacity-60">Sequência</div>
          <div className="num-hud mt-1 text-4xl">{data?.streak?.atual ?? 0}</div>
          <div className="text-xs opacity-60">melhor: {data?.streak?.melhor ?? 0}</div>
        </GlassCard>
        <GlassCard className="!p-4">
          <div className="text-xs uppercase tracking-widest opacity-60">Essa semana</div>
          <div className="num-hud mt-1 text-4xl">{Math.floor(semAtual / 60)}h{String(semAtual % 60).padStart(2, "0")}</div>
          <div className="text-xs opacity-60">
            semana passada: {Math.floor(semAnterior / 60)}h{String(semAnterior % 60).padStart(2, "0")}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mt-4">
        <div className="text-xs uppercase tracking-widest opacity-60">Voltas por dia (min)</div>
        <div className="mt-3 h-56">
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <defs>
                {(["vestibular", "enem", "escola", "scuderia"] as const).map((cat) => (
                  <linearGradient key={cat} id={`g-${cat}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CATEGORIA_COR[cat]} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={CATEGORIA_COR[cat]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="dia" stroke="rgba(255,255,255,0.5)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
              <Tooltip contentStyle={{ background: "rgba(20,20,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              {(["escola", "enem", "vestibular", "scuderia"] as const).map((cat) => (
                <Area key={cat} type="monotone" dataKey={cat} stroke={CATEGORIA_COR[cat]} fill={`url(#g-${cat})`} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="mt-4">
        <div className="text-xs uppercase tracking-widest opacity-60">Pódio da semana</div>
        <div className="mt-3 space-y-2">
          {podio.length === 0 && <div className="text-sm opacity-60">Ainda sem voltas registradas. Bora começar.</div>}
          {podio.slice(0, 3).map(([cat, min], i) => (
            <div key={cat} className="flex items-center gap-3">
              <div className="num-hud w-6 text-lg opacity-70">{i + 1}</div>
              <div className="flex-1">
                <div className="text-sm capitalize">{cat}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (min / (podio[0][1] || 1)) * 100)}%`, backgroundColor: CATEGORIA_COR[cat as keyof typeof CATEGORIA_COR] }} />
                </div>
              </div>
              <div className="num-hud text-sm">{Math.floor(min / 60)}h{String(min % 60).padStart(2, "0")}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="mt-4 !p-4">
        <div className="text-sm italic opacity-80">
          "Corrida boa não é a mais rápida, é a mais consistente. Bora rodar."
        </div>
      </GlassCard>
    </div>
  );
}
