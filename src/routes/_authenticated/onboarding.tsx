import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  rotinaPadrao,
  MATERIAS_ESCOLA_SEED,
  FRENTES_ENEM,
  FRENTES_UFMG,
} from "@/lib/domain";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ChevronRight, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const STEPS = ["Piloto", "Circuito", "Matérias", "Setup", "Notificações"] as const;

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [nome, setNome] = useState("");
  const [temporada, setTemporada] = useState("Temporada rumo à UFMG");
  const [academiaMin, setAcademiaMin] = useState(60);
  const [pesos, setPesos] = useState({ vestibular: 45, enem: 30, escola: 25 });
  const [risco, setRisco] = useState<Record<string, number>>(
    Object.fromEntries(MATERIAS_ESCOLA_SEED.map((m) => [m, 2]))
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (prof?.onboarding_completo) nav({ to: "/hoje" as string });
      if (prof?.nome && prof.nome !== "Piloto") setNome(prof.nome);
    });
  }, [nav]);

  async function finalizar() {
    setSalvando(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Sem sessão");

      // Profile
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          nome: nome || "Piloto",
          temporada_label: temporada,
          academia_duracao_min: academiaMin,
          peso_vestibular: pesos.vestibular,
          peso_enem: pesos.enem,
          peso_escola: pesos.escola,
          onboarding_completo: true,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      // Rotina (usa duração de academia informada)
      const rotina = rotinaPadrao().map((b) => {
        if (b.tipo === "academia") {
          const [h, m] = b.inicio.split(":").map(Number);
          const totalIni = h * 60 + m;
          const totalFim = totalIni + academiaMin;
          const fh = Math.floor(totalFim / 60);
          const fm = totalFim % 60;
          return { ...b, fim: `${String(fh).padStart(2, "0")}:${String(fm).padStart(2, "0")}` };
        }
        return b;
      });
      const { error: rErr } = await supabase.from("routine_blocks").insert(
        rotina.map((b) => ({ ...b, user_id: user.id }))
      );
      if (rErr) throw rErr;

      // Matérias
      const subjects = [
        ...MATERIAS_ESCOLA_SEED.map((nome) => ({
          user_id: user.id,
          nome,
          categoria: "escola" as const,
          cor: "#7DD3FC",
          risco: risco[nome] ?? 2,
        })),
        ...FRENTES_ENEM.map((nome) => ({
          user_id: user.id,
          nome,
          categoria: "enem" as const,
          cor: "#C4B5FD",
          risco: 2,
        })),
        ...FRENTES_UFMG.map((nome) => ({
          user_id: user.id,
          nome,
          categoria: "vestibular" as const,
          cor: "#FCA5A5",
          risco: 2,
        })),
      ];
      const { error: sErr } = await supabase.from("subjects").insert(subjects);
      if (sErr) throw sErr;

      toast.success("Setup pronto. Bora rodar.");
      nav({ to: "/hoje" as string });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no setup");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10">
      {/* Progresso */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-[var(--racing)]" : "bg-white/10"}`}
            />
          </div>
        ))}
      </div>
      <div className="mb-6 text-xs uppercase tracking-[0.2em] opacity-60">
        Passo {step + 1} / {STEPS.length} — {STEPS[step]}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong p-6"
        >
          {step === 0 && (
            <div className="space-y-4">
              <h1 className="text-2xl">Como te chamamos na equipe?</h1>
              <p className="text-sm opacity-70">
                Sou a Pit., sua equipe de boxes. Ajusto seu ritmo, protejo seu descanso e mantenho o
                foco na bandeirada.
              </p>
              <input
                className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-white/30"
                placeholder="Primeiro nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <input
                className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-white/30"
                placeholder="Nome da temporada"
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h1 className="text-2xl">Seu circuito semanal</h1>
              <p className="text-sm opacity-70">
                Já preenchi sua rotina com base no seu ritmo: escola, scuderia e academia nos dias
                certos. Você pode ajustar tudo depois em Ajustes.
              </p>
              <div className="glass-inset space-y-2 p-4 text-sm">
                <p>• <b>Ter/Qui</b>: escola integral 07:00–17:10</p>
                <p>• <b>Seg/Qua/Sex</b>: escola 07:00–12:20 → scuderia 13:00–15:30 → academia</p>
                <p>• <b>Sono protegido</b>: 22:00 – 05:40 (o app nunca sugere estudo aí)</p>
              </div>
              <label className="block">
                <span className="text-sm opacity-70">Duração da sua academia (min)</span>
                <input
                  type="number"
                  min={30}
                  max={120}
                  step={5}
                  className="mt-1 w-full rounded-xl bg-black/30 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-white/30"
                  value={academiaMin}
                  onChange={(e) => setAcademiaMin(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h1 className="text-2xl">Suas 20 matérias</h1>
              <p className="text-sm opacity-70">
                Marca o risco de cada uma: quanto mais alto, mais tempo eu reservo pra ela.
              </p>
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {MATERIAS_ESCOLA_SEED.map((m) => (
                  <div key={m} className="glass-inset flex items-center justify-between p-3">
                    <span className="text-sm">{m}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setRisco({ ...risco, [m]: v })}
                          className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                            risco[m] === v
                              ? v === 1
                                ? "bg-flag text-flag-foreground"
                                : v === 2
                                ? "bg-amber text-black"
                                : "bg-racing text-white"
                              : "bg-white/5 opacity-60"
                          }`}
                        >
                          {v === 1 ? "OK" : v === 2 ? "~" : "!"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h1 className="text-2xl">Setup de prioridades</h1>
              <p className="text-sm opacity-70">
                Como distribuo seu tempo de estudo entre as três frentes. Padrão: UFMG na frente.
              </p>
              {(["vestibular", "enem", "escola"] as const).map((k) => (
                <div key={k} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize opacity-80">
                      {k === "vestibular" ? "UFMG (seriado)" : k === "enem" ? "ENEM" : "Escola"}
                    </span>
                    <span className="num-hud">{pesos[k]}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    value={pesos[k]}
                    onChange={(e) => setPesos({ ...pesos, [k]: Number(e.target.value) })}
                    className="w-full accent-[var(--racing)]"
                  />
                </div>
              ))}
              <div className="text-xs opacity-60">
                Total: {pesos.vestibular + pesos.enem + pesos.escola}% (não precisa somar 100 — eu
                normalizo).
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h1 className="text-2xl">Notificações</h1>
              <p className="text-sm opacity-70">
                Aviso 10 min antes de cada bloco, alerto transições e mando o "wind-down" às 21:30 pra
                você dormir na hora certa.
              </p>
              <button
                type="button"
                onClick={async () => {
                  if ("Notification" in window) {
                    const perm = await Notification.requestPermission();
                    if (perm === "granted") toast.success("Permissão concedida.");
                    else toast.info("Sem problema — dá pra habilitar depois.");
                  }
                }}
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm"
              >
                Ativar notificações do navegador
              </button>
              <div className="glass-inset p-4 text-xs opacity-80">
                <b>Instala como app.</b> No celular, use "Adicionar à Tela Inicial" no menu do
                navegador pra abrir o Pit. como um app dedicado.
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-full px-5 py-2 text-sm opacity-70 disabled:opacity-30"
        >
          Voltar
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 rounded-full bg-[var(--racing)] px-5 py-2 text-sm font-semibold text-white"
          >
            Próximo <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={finalizar}
            disabled={salvando}
            className="flex items-center gap-2 rounded-full bg-[var(--flag)] px-5 py-2 text-sm font-semibold text-flag-foreground disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Bandeira verde"} <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
