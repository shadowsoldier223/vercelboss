import { cleanLootItemName, isBossBonusLoot, normalizeLootItemKey } from "./lootNames";
import type { LootDrop } from "./types";

export type LootSessionItem = {
  item: string;
  quantity: number;
  category: string;
  bonus: boolean;
};

export type LootSessionView = {
  id: string;
  createdAt: string;
  date: string;
  bossKey: string;
  bossName: string;
  player: string;
  registeredBy: string;
  quantity: number;
  items: LootSessionItem[];
};

export type PlayerItemTotal = {
  key: string;
  item: string;
  bossName: string;
  category: string;
  quantity: number;
  bonus: boolean;
};

export type PlayerLoot = {
  key: string;
  player: string;
  sessions: number;
  bosses: string[];
  /** Usuarios (contas) que registraram loot para este personagem/dupla. */
  registeredBy: string[];
  quantity: number;
  /** Quantidade de itens raro ou melhor (sem bonus de boss). */
  rare: number;
  lastAt: string;
  items: PlayerItemTotal[];
};

export type UserLoot = {
  key: string;
  user: string;
  sessions: number;
  quantity: number;
  rare: number;
  lastAt: string;
  /** Itens somados de todos os personagens do usuario (mesmo boss + item = uma linha). */
  items: PlayerItemTotal[];
  characters: PlayerLoot[];
};

const categoryRank: Record<string, number> = {
  unico: 0,
  "muito raro": 1,
  raro: 2,
  "semi-raro": 3,
  comum: 4,
  loot: 5,
};

function plain(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function categoryOrder(category: string) {
  return categoryRank[plain(category)] ?? 6;
}

function compareItems(a: { category: string; quantity: number; item: string }, b: { category: string; quantity: number; item: string }) {
  return categoryOrder(a.category) - categoryOrder(b.category) || b.quantity - a.quantity || a.item.localeCompare(b.item);
}

/**
 * Agrupa os drops salvos em sessoes (um registro de reward chest = uma sessao).
 * Os drops de uma mesma sessao compartilham o mesmo `createdAt`.
 */
export function buildLootSessions(drops: LootDrop[]): LootSessionView[] {
  const sessions = new Map<string, LootSessionView>();

  for (const drop of drops) {
    const player = drop.player?.trim() || drop.userName?.trim() || "Sem identificacao";
    const id = `${drop.createdAt}|${drop.bossKey}|${plain(player)}`;
    const session =
      sessions.get(id) ??
      {
        id,
        createdAt: drop.createdAt,
        date: drop.date || drop.createdAt,
        bossKey: drop.bossKey,
        bossName: drop.bossName,
        player,
        registeredBy: drop.userName?.trim() ?? "",
        quantity: 0,
        items: [],
      };

    const itemKey = normalizeLootItemKey(drop.item);
    const existing = session.items.find((entry) => normalizeLootItemKey(entry.item) === itemKey);

    if (existing) {
      existing.quantity += drop.quantity;
    } else {
      session.items.push({
        item: cleanLootItemName(drop.item) || drop.item,
        quantity: drop.quantity,
        category: drop.category,
        bonus: isBossBonusLoot(drop.item),
      });
    }

    session.quantity += drop.quantity;
    sessions.set(id, session);
  }

  const result = Array.from(sessions.values());

  for (const session of result) {
    session.items.sort(compareItems);
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Filtro por boss e por texto livre (jogador, boss ou item). Nao altera nenhum dado. */
export function filterLootSessions(sessions: LootSessionView[], filters: { bossKey: string; query: string }) {
  const query = plain(filters.query);

  return sessions
    .filter((session) => !filters.bossKey || session.bossKey === filters.bossKey)
    .map((session) => {
      if (!query) return session;

      // Se a busca bate no jogador ou no boss, mantem a sessao inteira.
      if (plain(session.player).includes(query) || plain(session.bossName).includes(query)) return session;

      const items = session.items.filter((entry) => plain(entry.item).includes(query));

      if (!items.length) return null;

      return { ...session, items, quantity: items.reduce((total, entry) => total + entry.quantity, 0) };
    })
    .filter((session): session is LootSessionView => Boolean(session));
}

/** Totais por jogador/dupla (quem dropou), nao por quem fez o registro. */
export function buildPlayerLoot(sessions: LootSessionView[]): PlayerLoot[] {
  const players = new Map<string, PlayerLoot>();

  for (const session of sessions) {
    const key = plain(session.player);
    const entry =
      players.get(key) ??
      { key, player: session.player, sessions: 0, bosses: [], registeredBy: [], quantity: 0, rare: 0, lastAt: session.createdAt, items: [] };

    entry.sessions += 1;
    entry.quantity += session.quantity;

    if (!entry.bosses.includes(session.bossName)) entry.bosses.push(session.bossName);
    if (session.registeredBy && !entry.registeredBy.includes(session.registeredBy)) entry.registeredBy.push(session.registeredBy);
    if (new Date(session.createdAt).getTime() > new Date(entry.lastAt).getTime()) entry.lastAt = session.createdAt;

    for (const item of session.items) {
      const itemKey = `${session.bossKey}:${normalizeLootItemKey(item.item)}`;
      const total = entry.items.find((existing) => existing.key === itemKey);

      if (total) {
        total.quantity += item.quantity;
      } else {
        entry.items.push({
          key: itemKey,
          item: item.item,
          bossName: session.bossName,
          category: item.category,
          quantity: item.quantity,
          bonus: item.bonus,
        });
      }
    }

    players.set(key, entry);
  }

  const result = Array.from(players.values());

  for (const entry of result) {
    entry.items.sort(compareItems);
    entry.rare = entry.items.reduce((total, item) => (!item.bonus && categoryOrder(item.category) <= 2 ? total + item.quantity : total), 0);
  }

  return result.sort((a, b) => b.sessions - a.sessions || b.quantity - a.quantity || a.player.localeCompare(b.player));
}

/** Agrupa por usuario (quem registrou) e, dentro de cada um, por personagem/dupla. */
export function buildUserLoot(sessions: LootSessionView[]): UserLoot[] {
  const groups = new Map<string, { user: string; sessions: LootSessionView[] }>();

  for (const session of sessions) {
    const user = session.registeredBy || "Sem usuario";
    const key = plain(user);
    const group = groups.get(key) ?? { user, sessions: [] };

    group.sessions.push(session);
    groups.set(key, group);
  }

  return Array.from(groups, ([key, group]) => {
    const characters = buildPlayerLoot(group.sessions);
    const items: PlayerItemTotal[] = [];

    for (const item of characters.flatMap((character) => character.items)) {
      const existing = items.find((entry) => entry.key === item.key);

      if (existing) existing.quantity += item.quantity;
      else items.push({ ...item });
    }

    items.sort(compareItems);

    return {
      key,
      user: group.user,
      sessions: group.sessions.length,
      quantity: characters.reduce((total, character) => total + character.quantity, 0),
      rare: characters.reduce((total, character) => total + character.rare, 0),
      lastAt: group.sessions.reduce((latest, session) => (new Date(session.createdAt).getTime() > new Date(latest).getTime() ? session.createdAt : latest), group.sessions[0].createdAt),
      items,
      characters,
    };
  }).sort((a, b) => b.sessions - a.sessions || b.quantity - a.quantity || a.user.localeCompare(b.user));
}
