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
  subjects: any[]; // todas as matérias cadastradas
  scuderiaTasks: any[]; // tarefas pendentes da scuderia
  historySubjectIds: string[]; // IDs de matérias escolares agendadas nos últimos 6 dias
}

const HORARIO_DIA_INICIO = 6 * 60; // 06:00
const HORARIO_DIA_FIM = 22 * 60; // 22:00 (nada depois disso)
const MIN_BLOCO = 25;

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
  const { dia, routine, pesos, subjects, scuderiaTasks, historySubjectIds } = input;
  const janelas = janelasLivres(dia, routine);
  const totalMin = janelas.reduce((acc, [a, b]) => acc + (b - a), 0);

  if (totalMin < MIN_BLOCO) return [];

  // 1. Dividir as janelas livres em ciclos de estudo de 50 minutos e 10 minutos de pausa (pit stop)
  const blocksToAssign: { inicio: number; fim: number; duracao_min: number; type: "study" | "pause" }[] = [];

  for (const [ini, fim] of janelas) {
    let cursor = ini;
    while (fim - cursor >= 30) {
      const remaining = fim - cursor;
      let dur = 50;
      if (remaining < 50) {
        dur = remaining; // se restar menos de 50min, consome o restante
      }

      blocksToAssign.push({
        inicio: cursor,
        fim: cursor + dur,
        duracao_min: dur,
        type: "study",
      });

      cursor += dur;

      // Se restar espaço na janela suficiente para outra aula (mín 30min + 10min de pausa = 40min)
      if (fim - cursor >= 40) {
        blocksToAssign.push({
          inicio: cursor,
          fim: cursor + 10,
          duracao_min: 10,
          type: "pause",
        });
        cursor += 10;
      } else if (fim - cursor > 0) {
        // Se houver um pequeno resíduo, adiciona como pausa/boxes
        const leftover = fim - cursor;
        blocksToAssign.push({
          inicio: cursor,
          fim: cursor + leftover,
          duracao_min: leftover,
          type: "pause",
        });
        cursor += leftover;
      }
    }
  }

  const studyBlocks = blocksToAssign.filter((b) => b.type === "study");
  if (studyBlocks.length === 0) return [];

  // 2. Verificar tarefas pendentes da scuderia com prazo próximo (nas próximas 48h)
  const agora = new Date();
  const next48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);
  const tarefasUrgentes = scuderiaTasks.filter((t) => {
    if (!t.prazo || t.status === "bandeirada") return false;
    const taskDate = new Date(t.prazo);
    return taskDate >= agora && taskDate <= next48h;
  });

  const scuderiaTaskToSchedule = tarefasUrgentes[0]; // pega a primeira tarefa urgente

  // 3. Organizar pesos de prioridades
  const weightVestibular = pesos.vestibular ?? 45;
  const weightEnem = pesos.enem ?? 30;
  const weightEscola = pesos.escola ?? 25;
  const totalWeight = weightVestibular + weightEnem + weightEscola;

  // 4. Mapear categorias para os blocos de estudo
  const studyIndices = blocksToAssign
    .map((b, i) => (b.type === "study" ? i : -1))
    .filter((i) => i !== -1);

  // Reservamos pelo menos 1 bloco para boxes (se houver pelo menos 2 blocos de estudo)
  // para garantir os 20-30 min de "Tempo de Boxes"
  let boxesIndex = -1;
  if (studyIndices.length >= 2) {
    boxesIndex = studyIndices[Math.floor(studyIndices.length / 2)];
  }

  // Reservamos 1 bloco para Scuderia se houver tarefas urgentes nas próximas 48h
  let scuderiaIndex = -1;
  if (scuderiaTaskToSchedule) {
    scuderiaIndex = studyIndices.find((idx) => idx !== boxesIndex) ?? -1;
  }

  // Frentes restantes a serem distribuídas
  const remainingStudyIndices = studyIndices.filter((idx) => idx !== boxesIndex && idx !== scuderiaIndex);
  const nToAssign = remainingStudyIndices.length;

  const categoriesToAssign: Categoria[] = [];
  const assignedCounts = { vestibular: 0, enem: 0, escola: 0 };

  for (let step = 0; step < nToAssign; step++) {
    // Escolhe a categoria com maior débito de tempo proporcional
    const targetVestibular = (step + 1) * (weightVestibular / totalWeight);
    const targetEnem = (step + 1) * (weightEnem / totalWeight);
    const targetEscola = (step + 1) * (weightEscola / totalWeight);

    const debtVestibular = targetVestibular - assignedCounts.vestibular;
    const debtEnem = targetEnem - assignedCounts.enem;
    const debtEscola = targetEscola - assignedCounts.escola;

    if (debtVestibular >= debtEnem && debtVestibular >= debtEscola) {
      categoriesToAssign.push("vestibular");
      assignedCounts.vestibular++;
    } else if (debtEnem >= debtVestibular && debtEnem >= debtEscola) {
      categoriesToAssign.push("enem");
      assignedCounts.enem++;
    } else {
      categoriesToAssign.push("escola");
      assignedCounts.escola++;
    }
  }

  // 5. Agrupamento de matérias
  const subjectsByCat = {
    escola: subjects.filter((s) => s.categoria === "escola"),
    enem: subjects.filter((s) => s.categoria === "enem"),
    vestibular: subjects.filter((s) => s.categoria === "vestibular"),
  };

  const scheduledToday = new Set<string>();

  // Função para escolher a matéria de acordo com as regras de prioridades e frequência
  const pickSubjectForCategory = (cat: "escola" | "enem" | "vestibular"): any => {
    const list = subjectsByCat[cat] ?? [];
    if (list.length === 0) return null;

    const scoredList = list.map((s) => {
      let score = s.risco || 2; // peso básico da dificuldade (risco: 1, 2 ou 3)

      const alreadyScheduled = scheduledToday.has(s.id);

      // Bônus por proximidade de provas (próximos 7 dias)
      if (s.prova_proxima) {
        const testDate = new Date(s.prova_proxima);
        const diffTime = testDate.getTime() - agora.getTime();
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        if (diffDays <= 2) {
          score += 1000;
        } else if (diffDays <= 7) {
          score += 500;
        } else if (diffDays <= 14) {
          score += 200;
        }
      }

      // Regra de frequência máxima de 7 dias sem aparecer (apenas para escola)
      if (cat === "escola") {
        const inHistory = historySubjectIds.includes(s.id);
        if (!inHistory) {
          score += 5000; // bônus massivo se não apareceu nos últimos 6 dias
        }
      }

      // Evitar repetição no mesmo dia se possível
      if (alreadyScheduled) {
        score -= 10000;
      }

      return { subject: s, score };
    });

    scoredList.sort((a, b) => b.score - a.score);
    const chosen = scoredList[0].subject;
    scheduledToday.add(chosen.id);
    return chosen;
  };

  // 6. Montagem dos blocos de sugestões
  const result: SuggestedBlock[] = [];
  let categoryPointer = 0;

  for (let i = 0; i < blocksToAssign.length; i++) {
    const b = blocksToAssign[i];
    if (b.type === "pause") {
      result.push({
        inicio: minToTime(b.inicio),
        fim: minToTime(b.fim),
        duracao_min: b.duracao_min,
        categoria: "boxes",
        label: b.duracao_min >= 20 ? "Tempo de Boxes — respira" : "Pit Stop",
        travado: true,
      });
    } else {
      if (i === boxesIndex) {
        result.push({
          inicio: minToTime(b.inicio),
          fim: minToTime(b.fim),
          duracao_min: b.duracao_min,
          categoria: "boxes",
          label: "Tempo de Boxes — respira",
          travado: true,
        });
      } else if (i === scuderiaIndex && scuderiaTaskToSchedule) {
        result.push({
          inicio: minToTime(b.inicio),
          fim: minToTime(b.fim),
          duracao_min: b.duracao_min,
          categoria: "scuderia",
          label: `🏁 Scuderia: ${scuderiaTaskToSchedule.titulo}`,
          travado: false,
        });
      } else {
        const cat = categoriesToAssign[categoryPointer];
        categoryPointer++;
        if (cat) {
          const subj = pickSubjectForCategory(cat as any);
          result.push({
            inicio: minToTime(b.inicio),
            fim: minToTime(b.fim),
            duracao_min: b.duracao_min,
            categoria: cat,
            subject_id: subj?.id,
            label: subj ? subj.nome : `Estudo de ${cat === "vestibular" ? "UFMG" : cat.toUpperCase()}`,
            travado: false,
          });
        } else {
          result.push({
            inicio: minToTime(b.inicio),
            fim: minToTime(b.fim),
            duracao_min: b.duracao_min,
            categoria: "boxes",
            label: "Tempo de Boxes — respira",
            travado: true,
          });
        }
      }
    }
  }

  return result;
}

