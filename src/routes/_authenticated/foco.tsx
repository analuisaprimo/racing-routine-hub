import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/foco")({ component: Foco });

type Modo = "volta" | "pit";

function Foco() {
  const [duracaoMin, setDuracaoMin] = useState(45);
  const [pitMin, setPitMin] = useState(10);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [modo, setModo] = useState<Modo>("volta");
  const [restante, setRestante] = useState(45 * 60);
  const [voltasHoje, setVoltasHoje] = useState(0);
  const [askReacao, setAskReacao] = useState(false);
  const tickRef = useRef<number | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ["subjects-foco"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("subjects").select("id, nome, categoria").eq("user_id", u.user!.id).order("nome");
      return data ?? [];
    },
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: u }) => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("study_sessions").select("id").eq("user_id", u.user!.id).eq("data", hoje);
      setVoltasHoje(data?.length ?? 0);
    });
  }, []);

  useEffect(() => {
    setRestante((modo === "volta" ? duracaoMin : pitMin) * 60);
  }, [duracaoMin, pitMin, modo]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          window.clearInterval(tickRef.current!);
          setRunning(false);
          onEnd();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function onEnd() {
    if (modo === "volta") {
      // Salvar sessão
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("study_sessions").insert({
        user_id: u.user!.id,
        subject_id: subjectId,
        duracao_min: duracaoMin,
        tipo_ciclo: "pomodoro",
        concluido: true,
      });
      setVoltasHoje((v) => v + 1);
      setAskReacao(true);
      toast.success("🏁 Volta completa. Boa!");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Pit.", { body: "Volta completa. Hora do pit stop." });
      }
    } else {
      toast.info("Pit stop terminado. Pronta pra próxima volta?");
      setModo("volta");
    }
  }

  async function salvarReacao(r: "tranquila" | "apertada" | "travei") {
    const { data: u } = await supabase.auth.getUser();
    // Atualiza a última sessão do dia com a reação
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: last } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("user_id", u.user!.id)
      .eq("data", hoje)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) await supabase.from("study_sessions").update({ reacao: r }).eq("id", last.id);
    setAskReacao(false);
    setModo("pit");
  }

  const total = (modo === "volta" ? duracaoMin : pitMin) * 60;
  const progresso = 1 - restante / total;
  const mins = Math.floor(restante / 60);
  const secs = restante % 60;

  const size = 320;
  const strokeW = 18;
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;

  const color = modo === "volta" ? "var(--racing)" : "var(--flag)";

  return (
    <div className="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-xl place-items-center px-4">
      <div className="w-full">
        <div className="mb-6 text-center">
          <div className="text-xs uppercase tracking-[0.22em] opacity-60">
            {modo === "volta" ? "Volta em andamento" : "Pit stop"}
          </div>
          <div className="mt-1 text-sm opacity-70">Voltas hoje: <b className="num-hud">{voltasHoje}</b></div>
        </div>

        <div className="glass-strong relative mx-auto grid place-items-center p-8" style={{ borderRadius: 40 }}>
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in oklab, white 8%, transparent)" strokeWidth={strokeW} />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeDasharray={`${c * progresso} ${c}`}
                animate={{ strokeDasharray: `${c * progresso} ${c}` }}
                transition={{ duration: 0.9, ease: "linear" }}
                style={{ filter: `drop-shadow(0 0 16px ${color})` }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="num-hud text-7xl leading-none">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.22em] opacity-60">
                  {modo === "volta" ? "foco" : "descanso"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => { setRestante(total); setRunning(false); }}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/10"
              aria-label="Resetar"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              className="grid h-16 w-16 place-items-center rounded-full text-white shadow-[0_16px_40px_-10px]"
              style={{ backgroundColor: color as any, boxShadow: `0 16px 40px -10px ${color}` }}
            >
              {running ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
            </button>
            <button
              onClick={() => setModo(modo === "volta" ? "pit" : "volta")}
              className="rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-widest"
            >
              {modo === "volta" ? "Ir pro pit" : "Volta"}
            </button>
          </div>
        </div>

        {/* Config */}
        <div className="glass mt-4 grid grid-cols-2 gap-3 p-4 text-sm">
          <label className="space-y-1">
            <span className="text-xs opacity-70">Volta (min)</span>
            <input type="number" min={5} max={120} value={duracaoMin}
              onChange={(e) => setDuracaoMin(Number(e.target.value))}
              className="w-full rounded-lg bg-black/30 px-3 py-2 num-hud outline-none ring-1 ring-white/10" />
          </label>
          <label className="space-y-1">
            <span className="text-xs opacity-70">Pit (min)</span>
            <input type="number" min={3} max={30} value={pitMin}
              onChange={(e) => setPitMin(Number(e.target.value))}
              className="w-full rounded-lg bg-black/30 px-3 py-2 num-hud outline-none ring-1 ring-white/10" />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-xs opacity-70">Matéria</span>
            <select
              value={subjectId ?? ""}
              onChange={(e) => setSubjectId(e.target.value || null)}
              className="w-full rounded-lg bg-black/30 px-3 py-2 outline-none ring-1 ring-white/10"
            >
              <option value="">— livre —</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>{s.nome} · {s.categoria}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <AnimatePresence>
        {askReacao && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm px-4"
          >
            <div className="glass-strong w-full max-w-sm p-6 text-center">
              <div className="text-xs uppercase tracking-widest opacity-60">Feedback rápido</div>
              <h3 className="mt-2 text-xl">Como foi essa volta?</h3>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { k: "tranquila", e: "😌", l: "Tranquila" },
                  { k: "apertada", e: "😅", l: "Apertada" },
                  { k: "travei", e: "😖", l: "Travei" },
                ].map((r) => (
                  <button
                    key={r.k}
                    onClick={() => salvarReacao(r.k as any)}
                    className="glass-inset flex flex-col items-center gap-1 py-3 hover:bg-white/10"
                  >
                    <span className="text-2xl">{r.e}</span>
                    <span className="text-xs">{r.l}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
