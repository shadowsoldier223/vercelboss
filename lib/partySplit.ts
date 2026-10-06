export type PartyMember = {
  name: string;
  isLeader: boolean;
  loot: number;
  supplies: number;
  balance: number;
};

export type PartySession = {
  duration: string;
  lootType: string;
  members: PartyMember[];
  totalLoot: number;
  totalSupplies: number;
  totalBalance: number;
};

export type PartyRow = {
  name: string;
  balance: number;
  /** Quanto este membro deveria ter ficado (parte igual do balance total). */
  target: number;
  /** balance - target: positivo = paga, negativo = recebe. */
  diff: number;
};

export type PartyTransfer = {
  from: string;
  to: string;
  amount: number;
  /** Texto para falar com o NPC do banco no jogo. */
  command: string;
};

export type PartySplit = {
  rows: PartyRow[];
  transfers: PartyTransfer[];
};

const metricPattern = /^(loot|supplies|balance|damage|healing|raw xp gain|xp gain)\s*:\s*(-?[\d.,]+)/i;

function parseAmount(value: string) {
  const negative = value.trim().startsWith("-");
  const digits = value.replace(/[^\d]/g, "");

  if (!digits) return 0;

  return negative ? -Number(digits) : Number(digits);
}

/**
 * Le o texto copiado do Party Hunt Analyser do Tibia.
 * Linhas "Chave: valor" antes do primeiro jogador sao os totais; depois de uma linha
 * sem ":" (o nome do jogador) elas passam a pertencer a esse jogador.
 */
export function parsePartyHunt(rawText: string): PartySession | null {
  const members: PartyMember[] = [];
  const totals = { loot: 0, supplies: 0, balance: 0 };
  let current: (PartyMember & { hasBalance: boolean }) | null = null;
  let duration = "";
  let lootType = "";
  const withBalance: Array<PartyMember & { hasBalance: boolean }> = [];

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) continue;

    const metric = line.match(metricPattern);

    if (metric) {
      const key = metric[1].toLowerCase();
      const value = parseAmount(metric[2]);
      const target = current ?? totals;

      if (key === "loot" || key === "supplies" || key === "balance") {
        target[key] = value;
        if (current && key === "balance") current.hasBalance = true;
      }

      continue;
    }

    if (line.includes(":")) {
      const header = line.match(/^(session|loot type)\s*:\s*(.+)$/i);

      if (header && !current) {
        if (header[1].toLowerCase() === "session") duration = header[2].trim();
        else lootType = header[2].trim();
      }

      continue;
    }

    // Linha sem ":" = nome do jogador (ex.: "Hajo (Leader)").
    const name = line.replace(/\(.*?\)/g, "").trim();

    if (!name || /^[\d\s.,-]+$/.test(name)) continue;

    current = { name, isLeader: /\(leader\)/i.test(line), loot: 0, supplies: 0, balance: 0, hasBalance: false };
    withBalance.push(current);
  }

  for (const member of withBalance) {
    members.push({
      name: member.name,
      isLeader: member.isLeader,
      loot: member.loot,
      supplies: member.supplies,
      balance: member.hasBalance ? member.balance : member.loot - member.supplies,
    });
  }

  if (members.length < 2) return null;

  const sum = (pick: (member: PartyMember) => number) => members.reduce((total, member) => total + pick(member), 0);
  const totalBalance = sum((member) => member.balance);

  return {
    duration,
    lootType,
    members,
    totalLoot: totals.loot || sum((member) => member.loot),
    totalSupplies: totals.supplies || sum((member) => member.supplies),
    // O total declarado no cabecalho pode divergir por arredondamento; a soma dos membros e a base do calculo.
    totalBalance,
  };
}

/**
 * Divide o balance total em partes iguais (inteiras, sem sobra de gp) e descobre
 * quem paga a quem com o menor numero razoavel de transferencias.
 */
export function computePartySplit(members: PartyMember[]): PartySplit {
  const count = members.length;

  if (!count) return { rows: [], transfers: [] };

  const total = members.reduce((sum, member) => sum + member.balance, 0);
  const base = Math.floor(total / count);
  const remainder = total - base * count;

  const rows: PartyRow[] = members.map((member, index) => {
    // Os gp que sobram da divisao inteira vao 1 a 1 para os primeiros membros.
    const target = base + (index < remainder ? 1 : 0);

    return { name: member.name, balance: member.balance, target, diff: member.balance - target };
  });

  const payers = rows.filter((row) => row.diff > 0).map((row) => ({ name: row.name, left: row.diff })).sort((a, b) => b.left - a.left);
  const receivers = rows.filter((row) => row.diff < 0).map((row) => ({ name: row.name, left: -row.diff })).sort((a, b) => b.left - a.left);
  const transfers: PartyTransfer[] = [];
  let p = 0;
  let r = 0;

  while (p < payers.length && r < receivers.length) {
    const amount = Math.min(payers[p].left, receivers[r].left);

    if (amount > 0) {
      transfers.push({
        from: payers[p].name,
        to: receivers[r].name,
        amount,
        command: `transfer ${amount} to ${receivers[r].name}`,
      });
    }

    payers[p].left -= amount;
    receivers[r].left -= amount;

    if (payers[p].left === 0) p += 1;
    if (receivers[r].left === 0) r += 1;
  }

  return { rows, transfers };
}
