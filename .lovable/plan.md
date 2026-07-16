# Pit. — plano de construção

App PWA mobile-first para organizar rotina, estudos (UFMG seriado > ENEM > 20 matérias), scuderia STEM e academia, com linguagem visual de pit stop / telemetria de F1 + Liquid Glass.

## Nome e identidade

- Nome: **Pit.** (curto, cabe como ícone, PWA name = "Pit.")
- Logo: bandeira quadriculada estilizada dentro de um círculo (velocímetro implícito), monocromática, funciona em favicon 32px.
- Fontes: **Space Grotesk** (títulos + números telemétricos, com `font-variant-numeric: tabular-nums`) + **Inter** (corpo). Carregadas via `<link>` no `__root.tsx`.
- Paleta (tokens em `src/styles.css`, oklch):
  - accent corrida (`--racing`): vermelho ~ #E63946
  - bandeirada (`--flag`): verde ~ #00C896
  - âmbar setup (`--amber`) para transição do medidor
  - superfícies glass: `--glass-bg` (branco 8-14% alpha), `--glass-border` (gradiente topo→base), `--glass-shadow` difuso
  - gradiente de fundo por período: manhã pêssego/lavanda, tarde céu, noite índigo com pontos de luz — variável CSS `--sky-*` recalculada por hora no client.

## Stack e integrações

- TanStack Start (já configurado) + Tailwind v4 + shadcn.
- **Lovable Cloud** (Supabase) para auth (email/senha + magic link) e persistência.
- PWA installable com manifest + ícones. Sem service worker de cache (regra do template); web push adicionado como messaging SW dedicado (Firebase Cloud Messaging via Lovable AI/edge? — ver observação abaixo).
- Framer Motion para microinterações (check animado, confete sutil, bounce, transições de tela).
- @dnd-kit para drag-and-drop dos blocos livres.
- Recharts para telemetria semanal.

> **Nota push**: Web Push em PWA exige VAPID keys e um serviço para enviar. Vou implementar as notificações **locais** (Notifications API + agendamento via SW leve dedicado ao messaging) que cobrem 100% dos casos listados (avisos de bloco, transição, wind-down, streak, celebração) sem depender de servidor externo. Push remoto server-side pode ser adicionado depois.

## Schema (Supabase)

- `profiles` (id, nome, saudação, avatar, sono_inicio, sono_fim, temporada_label, criado_em)
- `subjects` (id, user_id, nome, categoria: escola|enem|vestibular|scuderia, cor, risco 1-3, prova_proxima)
- `routine_blocks` (id, user_id, dia_semana, inicio, fim, tipo: escola|scuderia|academia|deslocamento|sono|livre, travado bool, label)
- `study_sessions` (id, user_id, subject_id, data, duracao_min, tipo_ciclo, reacao: tranquila|apertada|travei, concluido)
- `scuderia_tasks` (id, user_id, titulo, descricao, prazo, status: boxes|volta|bandeirada, prioridade, sobrou_oficina bool)
- `daily_plans` (id, user_id, data, blocos jsonb, meta_min, cumprido_min)
- `notification_prefs` (por categoria bool)
- `streaks` (user_id, atual, melhor, ultima_data)
- RLS por `auth.uid()` em tudo, com GRANTs.

## Telas (rotas TanStack)

- `/auth` — login/magic link (glass card sobre gradiente animado)
- `/onboarding` — wizard 5 passos: saudação → rotina fixa (pré-preenchida com o cronograma real) → 20 matérias + risco → prioridades (sliders "setup de carro") → notificações
- `/` — **Dashboard "Hoje"** (público-visualizador redireciona pra /auth)
  - Header saudação + temporada
  - Card "Próxima Volta" com countdown
  - Timeline vertical do dia (blocos travados vs livres com dnd)
  - Medidor "Combustível do Dia" (SVG circular animado, cor muda vermelho→âmbar→verde)
  - "Box da Scuderia — pendências"
  - Streak "🏁 X corridas seguidas"
  - FAB glass "captura rápida"
- `/circuito` — visão semanal (grid 7 dias, blocos coloridos, arrastar entre dias)
- `/estudos` — planejador por frente/matéria, barras de progresso semanais, sugestão do dia com botões aceitar/editar/requalificar
- `/scuderia` — kanban 3 colunas (Boxes → Em volta → Bandeirada), tag "sobrou da oficina"
- `/foco` — cronômetro pomodoro tela cheia glass, velocímetro circular, contador de voltas, reação pós-volta
- `/telemetria` — gráficos Recharts, pódio da semana, streaks, comparação semana atual vs anterior
- `/ajustes` — rotina, matérias, prioridades (sliders), notificações, sono, logout

Rotas protegidas sob `_authenticated/` (integração já gerencia o gate).

## Algoritmo de sugestão de blocos

Rodando client-side (deterministic), input: rotina fixa + matérias + pesos + provas próximas + tarefas scuderia pendentes.

1. Calcula "pista livre" do dia (janelas entre blocos travados − sono − deslocamento − jantar auto 30min).
2. Aloca peso configurável (default 45/30/25 vestibular/enem/escola).
3. Dentro de escola: ordena por (dias até prova ↓, risco ↓).
4. Insere pit stops obrigatórios a cada ≤90 min.
5. Reserva ≥1 bloco "Tempo de Boxes" (20-30 min, não editável).
6. Se houver `scuderia_tasks` com status ≠ bandeirada e prazo próximo, injeta com borda vermelha sutil.
7. Nunca depois de 22h; wind-down a partir de 21:30.

## Microinterações (framer-motion)

- Check da volta: stroke draw (pathLength 0→1, 400ms cubic-bezier(0.22,1,0.36,1))
- Confete "bandeirada" em partículas ao bater meta
- Medidor: spring animation, cor via interpolação HSL
- Transições de rota: slide + fade 300ms
- Countdown 3-2-1 opcional ao dar pull-to-refresh (skip com tap)

## PWA

- `public/manifest.webmanifest` com display standalone, ícones 192/512, theme-color, background-color, name "Pit.", short_name "Pit"
- Ícones gerados (bandeira quadriculada estilizada)
- Meta tags no `__root.tsx`: manifest, theme-color, apple-touch-icon
- Notificações: pedir permissão no onboarding passo final. Agendamento via `setTimeout` client + persistência das prefs; SW dedicado só para exibir a notification quando app estiver em background (não é cache de app shell).

## Ordem de execução

1. Ativar Lovable Cloud + migrations (todas as tabelas + RLS + GRANTs em uma só)
2. Design system: `src/styles.css` com tokens glass, racing, flag, gradientes, fontes carregadas no `__root.tsx`, meta/OG
3. Auth (`/auth`) + gate `_authenticated`
4. Onboarding com seed da rotina real
5. Dashboard "Hoje" (peça central — mais polida)
6. Foco/Pomodoro
7. Estudos (planejador + algoritmo)
8. Scuderia (kanban)
9. Circuito semanal (dnd)
10. Telemetria (Recharts)
11. Ajustes + notificações + PWA manifest/ícones
12. Estados vazios ilustrados (SVG line-art: capacete, bandeira, velocímetro)

## Detalhes técnicos que preciso alinhar antes de começar

- **Academia**: assumi 16:00– 17:20 seg/qua/sex; confirmar duração real (pode ser 1h, 1h15).
- **Fim de semana**: começo com sábado/domingo 100% "pista livre" (sem blocos travados) e o algoritmo sugere blocos longos de vestibular. Editável em Ajustes.
- **Push remoto** (servidor enviando notificação com app fechado): não incluso no MVP — apenas notificações locais agendadas. Cobre todos os cenários listados desde que o app tenha sido aberto pelo menos uma vez no dia (o SW re-agenda ao abrir).

Se OK com esses três pontos, sigo para implementação começando por Cloud + schema + design system + auth em paralelo.