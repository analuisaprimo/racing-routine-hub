import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();

  useEffect(() => {
    nav({ to: "/hoje" as string });
  }, [nav]);

  return null;
}

