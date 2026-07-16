import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const email = "pessoal@exemplo.com";
      const password = "pessoal-password-123";

      // Tenta login silencioso com usuário padrão
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Se o usuário não existe, tenta cadastrar silenciosamente
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome: "Piloto" },
          },
        });

        if (signUpError) {
          console.error("Erro no login automático:", signUpError);
          // Retorna um usuário mockado para evitar crashar o frontend
          return {
            user: {
              id: "00000000-0000-0000-0000-000000000000",
              email,
            } as any,
          };
        }
        return { user: signUpData.user! };
      }
      return { user: signInData.user! };
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="min-h-screen pb-28">
      <Outlet />
      <BottomNav />
    </div>
  );
}
