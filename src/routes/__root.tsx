import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass max-w-md p-8 text-center">
        <div className="num-hud text-6xl">404</div>
        <h2 className="mt-3 text-xl">Você saiu da pista</h2>
        <p className="mt-2 text-sm opacity-70">Essa rota não existe no circuito.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-[var(--racing)] px-5 py-2 text-sm font-medium text-white">
          Voltar pro grid
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass max-w-md p-8 text-center">
        <h1 className="text-xl">Bandeira amarela</h1>
        <p className="mt-2 text-sm opacity-70">Algo travou. Tenta de novo?</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-[var(--racing)] px-5 py-2 text-sm font-medium text-white"
        >
          Retomar corrida
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Pit. — sua equipe de boxes pros estudos" },
      { name: "description", content: "App de rotina e estudos com linguagem de pit stop. Priorize UFMG, ENEM e escola sem perder o ritmo." },
      { name: "theme-color", content: "#0B1220" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Pit." },
      { property: "og:title", content: "Pit. — sua equipe de boxes pros estudos" },
      { property: "og:description", content: "App de rotina e estudos com linguagem de pit stop. Priorize UFMG, ENEM e escola sem perder o ritmo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Pit. — sua equipe de boxes pros estudos" },
      { name: "twitter:description", content: "App de rotina e estudos com linguagem de pit stop. Priorize UFMG, ENEM e escola sem perder o ritmo." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1665de3e-1bea-4ea1-a2b6-77f620f07e29/id-preview-cd2a5e8f--790cedbf-52fb-4dfd-8c88-ddfb676d40d7.lovable.app-1784241675003.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1665de3e-1bea-4ea1-a2b6-77f620f07e29/id-preview-cd2a5e8f--790cedbf-52fb-4dfd-8c88-ddfb676d40d7.lovable.app-1784241675003.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" theme="dark" richColors />
    </QueryClientProvider>
  );
}
