import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/hoje" as string });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome },
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        toast.success("Grid liberado. Bora começar a temporada.");
        nav({ to: "/hoje" as string });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Volta de aquecimento iniciada.");
        nav({ to: "/hoje" as string });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falhou.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      {/* Trilhas de luz decorativas */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--racing)]/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[var(--enem)]/25 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong w-full max-w-md p-7"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black/40">
            <span className="racing-stripe h-1.5 w-6 rounded-full" />
          </div>
          <div>
            <div className="num-hud text-2xl leading-none">Pit.</div>
            <div className="text-xs opacity-60">Sua equipe de boxes</div>
          </div>
        </div>

        <h1 className="mt-6 text-2xl">
          {mode === "signup" ? "Entra no grid" : "Volta pra pista"}
        </h1>
        <p className="mt-1 text-sm opacity-70">
          {mode === "signup"
            ? "Vamos configurar seu circuito em poucos minutos."
            : "Toca o motor e continua a temporada."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <input
              className="w-full rounded-xl bg-black/30 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-white/30"
              placeholder="Como te chamamos?"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            className="w-full rounded-xl bg-black/30 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-white/30"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-xl bg-black/30 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-white/30"
            placeholder="Senha (mín. 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--racing)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_var(--racing)] transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Aquecendo…" : mode === "signup" ? "Largar" : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs opacity-70 hover:opacity-100"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        >
          {mode === "signup" ? "Já corre com a gente? Entrar" : "Novo no grid? Criar conta"}
        </button>
      </motion.div>
    </div>
  );
}
