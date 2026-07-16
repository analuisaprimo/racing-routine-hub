
-- Enums
CREATE TYPE public.subject_category AS ENUM ('escola', 'enem', 'vestibular', 'scuderia');
CREATE TYPE public.block_type AS ENUM ('escola', 'scuderia', 'academia', 'deslocamento', 'sono', 'livre', 'jantar', 'boxes');
CREATE TYPE public.task_status AS ENUM ('boxes', 'volta', 'bandeirada');
CREATE TYPE public.session_reaction AS ENUM ('tranquila', 'apertada', 'travei');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Piloto',
  temporada_label TEXT DEFAULT 'Temporada rumo à UFMG',
  sono_inicio TIME DEFAULT '22:00',
  sono_fim TIME DEFAULT '05:40',
  academia_duracao_min INT DEFAULT 60,
  peso_vestibular INT DEFAULT 45,
  peso_enem INT DEFAULT 30,
  peso_escola INT DEFAULT 25,
  onboarding_completo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria public.subject_category NOT NULL DEFAULT 'escola',
  cor TEXT DEFAULT '#7DD3FC',
  risco INT NOT NULL DEFAULT 2 CHECK (risco BETWEEN 1 AND 3),
  prova_proxima DATE,
  meta_semanal_min INT DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subjects" ON public.subjects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Routine blocks (fixed weekly schedule)
CREATE TABLE public.routine_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  inicio TIME NOT NULL,
  fim TIME NOT NULL,
  tipo public.block_type NOT NULL,
  travado BOOLEAN NOT NULL DEFAULT true,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_blocks TO authenticated;
GRANT ALL ON public.routine_blocks TO service_role;
ALTER TABLE public.routine_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_blocks" ON public.routine_blocks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study sessions
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  duracao_min INT NOT NULL,
  tipo_ciclo TEXT DEFAULT 'pomodoro',
  reacao public.session_reaction,
  concluido BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_sessions_user_data ON public.study_sessions(user_id, data DESC);

-- Scuderia tasks
CREATE TABLE public.scuderia_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prazo DATE,
  status public.task_status NOT NULL DEFAULT 'boxes',
  prioridade INT NOT NULL DEFAULT 2 CHECK (prioridade BETWEEN 1 AND 3),
  sobrou_oficina BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scuderia_tasks TO authenticated;
GRANT ALL ON public.scuderia_tasks TO service_role;
ALTER TABLE public.scuderia_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_tasks" ON public.scuderia_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notification prefs
CREATE TABLE public.notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  aviso_bloco BOOLEAN NOT NULL DEFAULT true,
  aviso_scuderia BOOLEAN NOT NULL DEFAULT true,
  aviso_transicao BOOLEAN NOT NULL DEFAULT true,
  wind_down BOOLEAN NOT NULL DEFAULT true,
  streak_risco BOOLEAN NOT NULL DEFAULT true,
  celebracao BOOLEAN NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_prefs" ON public.notification_prefs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Streaks
CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  atual INT NOT NULL DEFAULT 0,
  melhor INT NOT NULL DEFAULT 0,
  ultima_data DATE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streaks TO authenticated;
GRANT ALL ON public.streaks TO service_role;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_streaks" ON public.streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.tg_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.scuderia_tasks FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Auto-create profile + prefs + streak on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', 'Piloto'));
  INSERT INTO public.notification_prefs (user_id) VALUES (NEW.id);
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
