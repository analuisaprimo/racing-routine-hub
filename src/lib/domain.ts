// Domínio Pit. — tipos, rotina padrão da usuária, matérias seed.

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Dom
export type Categoria = "escola" | "enem" | "vestibular" | "scuderia";
export type BlockType =
  | "escola"
  | "scuderia"
  | "academia"
  | "deslocamento"
  | "sono"
  | "livre"
  | "jantar"
  | "boxes";

export interface RoutineBlock {
  id?: string;
  dia_semana: DiaSemana;
  inicio: string; // HH:MM
  fim: string;
  tipo: BlockType;
  travado: boolean;
  label?: string | null;
}

export const DIAS_NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
export const DIAS_LONGOS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const CATEGORIA_COR: Record<Categoria | BlockType, string> = {
  escola: "var(--color-escola)",
  enem: "var(--color-enem)",
  vestibular: "var(--color-vestibular)",
  scuderia: "var(--color-scuderia)",
  academia: "var(--color-academia)",
  deslocamento: "oklch(0.6 0.02 260)",
  sono: "oklch(0.4 0.04 275)",
  livre: "var(--color-flag)",
  jantar: "oklch(0.7 0.1 60)",
  boxes: "var(--color-amber)",
};

export const CATEGORIA_LABEL: Record<BlockType, string> = {
  escola: "Escola",
  scuderia: "Scuderia",
  academia: "Academia",
  deslocamento: "Deslocamento",
  sono: "Sono",
  livre: "Pista livre",
  jantar: "Jantar",
  boxes: "Tempo de boxes",
};

// Rotina padrão baseada no briefing.
// Seg=1, Ter=2, Qua=3, Qui=4, Sex=5
export function rotinaPadrao(): Omit<RoutineBlock, "id">[] {
  const base: Omit<RoutineBlock, "id">[] = [];

  // Sono todos os dias 22:00–05:40
  for (let d = 0; d <= 6; d++) {
    base.push({
      dia_semana: d as DiaSemana,
      inicio: "22:00",
      fim: "23:59",
      tipo: "sono",
      travado: true,
      label: "Sono",
    });
    base.push({
      dia_semana: d as DiaSemana,
      inicio: "00:00",
      fim: "05:40",
      tipo: "sono",
      travado: true,
      label: "Sono",
    });
  }

  // Seg / Qua / Sex — escola manhã + scuderia + academia
  for (const d of [1, 3, 5] as DiaSemana[]) {
    base.push({ dia_semana: d, inicio: "07:00", fim: "12:20", tipo: "escola", travado: true, label: "Escola" });
    base.push({ dia_semana: d, inicio: "12:20", fim: "13:00", tipo: "deslocamento", travado: true, label: "Almoço + trânsito" });
    base.push({ dia_semana: d, inicio: "13:00", fim: "15:30", tipo: "scuderia", travado: true, label: "Scuderia" });
    base.push({ dia_semana: d, inicio: "15:30", fim: "16:30", tipo: "academia", travado: true, label: "Academia" });
    base.push({ dia_semana: d, inicio: "16:30", fim: "17:00", tipo: "deslocamento", travado: true, label: "Volta pra casa" });
    base.push({ dia_semana: d, inicio: "19:30", fim: "20:00", tipo: "jantar", travado: true, label: "Jantar" });
  }

  // Ter / Qui — escola integral
  for (const d of [2, 4] as DiaSemana[]) {
    base.push({ dia_semana: d, inicio: "07:00", fim: "17:10", tipo: "escola", travado: true, label: "Escola integral" });
    base.push({ dia_semana: d, inicio: "17:10", fim: "18:00", tipo: "deslocamento", travado: true, label: "Volta pra casa" });
    base.push({ dia_semana: d, inicio: "19:30", fim: "20:00", tipo: "jantar", travado: true, label: "Jantar" });
  }

  return base;
}

// 15 matérias escolares com dificuldades padrão
export const MATERIAS_ESCOLA_SEED = [
  "Matemática",
  "Português",
  "Produção de texto",
  "Literatura",
  "História",
  "Filosofia",
  "Sociologia",
  "Geografia",
  "Matemática e Consumo",
  "Matemática do Cotidiano",
  "Elianete",
  "Elizandra",
  "Química",
  "Física",
  "Biologia",
];

export const MATERIAS_DIFICULDADES: Record<string, number> = {
  "Matemática": 2, // Médio
  "Português": 2, // Médio
  "Produção de texto": 2, // Médio
  "Literatura": 1, // Mínimo
  "História": 2, // Médio
  "Filosofia": 2, // Médio
  "Sociologia": 2, // Médio
  "Geografia": 1, // Mínimo
  "Matemática e Consumo": 1, // Mínimo
  "Matemática do Cotidiano": 1, // Mínimo
  "Elianete": 2, // Médio
  "Elizandra": 2, // Médio
  "Química": 3, // Máximo
  "Física": 2, // Médio
  "Biologia": 3, // Máximo
};


// Frentes ENEM + Vestibular UFMG (seed rápido, editável)
export const FRENTES_ENEM = [
  "Linguagens ENEM",
  "Matemática ENEM",
  "Ciências da Natureza ENEM",
  "Ciências Humanas ENEM",
  "Redação ENEM",
];

export const FRENTES_UFMG = [
  "Português UFMG",
  "Matemática UFMG",
  "Física UFMG",
  "Química UFMG",
  "Biologia UFMG",
  "História UFMG",
  "Geografia UFMG",
  "Inglês UFMG",
  "Literatura UFMG",
  "Redação UFMG",
];

export function periodoDoDia(hora: number): "manha" | "tarde" | "noite" {
  if (hora < 12) return "manha";
  if (hora < 18) return "tarde";
  return "noite";
}

export function saudacaoContextual(hora: number, nome: string): string {
  const p = periodoDoDia(hora);
  if (p === "manha") return `Bom dia, ${nome}`;
  if (p === "tarde") return `Boa tarde, ${nome}`;
  return `Boa noite, ${nome}`;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function minToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
