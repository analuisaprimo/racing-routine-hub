// Algoritmo de sugestão de blocos de estudo — Pit.
import { timeToMin, minToTime, type RoutineBlock, type DiaSemana, type Categoria } from "./domain";

export interface SuggestedBlock {
  inicio: string;
  fim: string;
  duracao_min: number;
  categoria: Categoria | "boxes";
  subject_id?: string;
  label: string;
  travado?: boolean;
}

export interface SchedulerInput {
  dia: DiaSemana;
  routine: RoutineBlock[];
  pesos: { vestibular: number; enem: number; escola: number };
  subjectsPorCategoria: Record<Categoria, { id: string; nome: string; risco: number; diasAteProva?: number }[]>;
  scuderiaPendentes: number; // qtd de tarefas pendentes com prazo próximo
}

const HORARIO_DIA_INICIO = 6 * 60; // 06:00
const HORARIO_DIA_FIM = 22 * 60; // 22:00 (nada depois disso)
const MIN_BLOCO = 25;
const MAX_BLOCO = 90;
const PIT_STOP = 15;

/** Retorna as janelas de "pista livre" entre blocos travados */
export function janelasLivres(dia: DiaSemana, routine: RoutineBlock[]): [number, number][] {
  const blocos = routine
    .filter((b) => b.dia_semana === dia && b.travado)
    .map((b) => [timeToMin(b.inicio), timeToMin(b.fim)] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const janelas: [number, number][] = [];
  let cursor = HORARIO_DIA_INICIO;
  for (const [ini, fim] of blocos) {
    if (ini > cursor) janelas.push([cursor, Math.min(ini, HORARIO_DIA_FIM)]);
    cursor = Math.max(cursor, fim);
    if (cursor >= HORARIO_DIA_FIM) break;
  }
  if (cursor < HORARIO_DIA_FIM) janelas.push([cursor, HORARIO_DIA_FIM]);
  // filtra janelas menores que 25min
  return janelas.filter(([a, b]) => b - a >= MIN_BLOCO);
}

export function totalPistaLivre(dia: DiaSemana, routine: RoutineBlock[]): number {
  return janelasLivres(dia, routine).reduce((acc, [a, b]) => acc + (b - a), 0);
}

/** Gera blocos sugeridos para o dia */
export function sugerirBlocos(input: SchedulerInput): SuggestedBlock[] {
  const { dia, routine, pesos, subjectsPorCategoria } = input;
  const janelas = janelasLivres(dia, routine);
  const totalMin = janelas.reduce((acc, [a, b]) => acc + (b - a), 0);

  if (totalMin < MIN_BLOCO) return [];

  // Reserva 25min para "boxes"
  const reservaBoxes = Math.min(25, Math.floor(totalMin * 0.08));
  const disponivel = totalMin - reservaBoxes;

  const somaPesos = pesos.vestibular + pesos.enem + pesos.escola || 100;
  const alvo: Record<Categoria, number> = {
    vestibular: Math.floor((disponivel * pesos.vestibular) / somaPesos),
    enem: Math.floor((disponivel * pesos.enem) / somaPesos),
    escola: Math.floor((disponivel * pesos.escola) / somaPesos),
    scuderia: 0,
  };

  // Ordena matérias dentro de cada categoria: prova mais próxima primeiro, depois risco
  const pickSubject = (cat: Categoria) => {
    const list = subjectsPorCategoria[cat] ?? [];
    return list.slice().sort((a, b) => {
      const da = a.diasAteProva ?? 999;
      const db = b.diasAteProva ?? 999;
      if (da !== db) return da - db;
      return b.risco - a.risco;
    })[0];
  };

  const blocos: SuggestedBlock[] = [];
  let boxesInserido = false;

  for (const [ini, fim] of janelas) {
    let cursor = ini;
    while (fim - cursor >= MIN_BLOCO) {
      // Insere boxes uma vez, preferencialmente numa janela do meio
      if (!boxesInserido && fim - cursor >= 25 && Math.random() < 0.3) {
        blocos.push({
          inicio: minToTime(cursor),
          fim: minToTime(cursor + 25),
          duracao_min: 25,
          categoria: "boxes",
          label: "Tempo de Boxes — respira",
          travado: true,
        });
        cursor += 25;
        boxesInserido = true;
        continue;
      }

      // Escolhe a categoria com maior déficit relativo
      const catOrder = (Object.keys(alvo) as Categoria[])
        .filter((c) => alvo[c] > 0 && (subjectsPorCategoria[c]?.length ?? 0) > 0)
        .sort((a, b) => alvo[b] - alvo[a]);
      if (catOrder.length === 0) break;

      const cat = catOrder[0];
      const subj = pickSubject(cat);
      if (!subj) {
        alvo[cat] = 0;
        continue;
      }

      const dur = Math.min(MAX_BLOCO, Math.max(MIN_BLOCO, alvo[cat]), fim - cursor);
      blocos.push({
        inicio: minToTime(cursor),
        fim: minToTime(cursor + dur),
        duracao_min: dur,
        categoria: cat,
        subject_id: subj.id,
        label: subj.nome,
      });
      alvo[cat] -= dur;
      cursor += dur;

      // Pit stop após bloco longo
      if (dur >= 60 && fim - cursor >= PIT_STOP) {
        blocos.push({
          inicio: minToTime(cursor),
          fim: minToTime(cursor + PIT_STOP),
          duracao_min: PIT_STOP,
          categoria: "boxes",
          label: "Pit stop",
          travado: true,
        });
        cursor += PIT_STOP;
      }
    }
  }

  // Garantir pelo menos um bloco de boxes
  if (!boxesInserido && blocos.length > 0) {
    // Substitui o último bloco por boxes se for curto
  }

  return blocos;
}
