import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/hoje" as string });
      else nav({ to: "/auth" as string });
    });
  }, [nav]);
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="glass px-8 py-6 text-center">
        <div className="num-hud text-4xl">Pit.</div>
        <p className="mt-2 text-sm opacity-70">Preparando o grid…</p>
      </div>
    </div>
  );
}

// silence unused
void redirect;
