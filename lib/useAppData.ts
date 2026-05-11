"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultData, duoCooldownMs, oldStorageKey, storageKey } from "./defaults";
import { getLootBoss, parseLootPaste } from "./loot";
import type { AppData, Duo, DuoStatus, Feat, LootDrop } from "./types";

type FeatInput = Omit<Feat, "id">;

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeData(data: Partial<AppData> | null): AppData {
  return {
    feats: data?.feats?.length ? data.feats : defaultData.feats,
    duos: data?.duos?.length ? data.duos : defaultData.duos,
    drops: data?.drops ?? [],
  };
}

function readStoredData(): AppData {
  const stored = window.localStorage.getItem(storageKey);

  if (stored) {
    return normalizeData(JSON.parse(stored) as Partial<AppData>);
  }

  const oldFeats = window.localStorage.getItem(oldStorageKey);

  if (oldFeats) {
    return normalizeData({
      ...defaultData,
      feats: JSON.parse(oldFeats) as Feat[],
    });
  }

  return defaultData;
}

export function useAppData() {
  const [data, setData] = useState<AppData>(defaultData);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      setData(readStoredData());
    } catch {
      setData(defaultData);
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [data, hasLoaded]);

  const stats = useMemo(() => {
    const itemTotals = new Map<string, { item: string; quantity: number; category: string }>();
    const characterTotals = new Map<string, { player: string; quantity: number }>();

    for (const drop of data.drops) {
      const item = itemTotals.get(drop.item) ?? {
        item: drop.item,
        quantity: 0,
        category: drop.category,
      };
      item.quantity += drop.quantity;
      itemTotals.set(drop.item, item);

      const player = characterTotals.get(drop.player) ?? {
        player: drop.player,
        quantity: 0,
      };
      player.quantity += drop.quantity;
      characterTotals.set(drop.player, player);
    }

    return {
      totalFeats: data.feats.length,
      bosses: data.feats.filter((feat) => feat.type === "Boss").length,
      hunts: data.feats.filter((feat) => feat.type === "Hunt").length,
      achievements: data.feats.filter((feat) => feat.type === "Conquista").length,
      duos: data.duos.length,
      drops: data.drops.length,
      itemTotals: Array.from(itemTotals.values()).sort((a, b) => b.quantity - a.quantity),
      characterTotals: Array.from(characterTotals.values()).sort((a, b) => b.quantity - a.quantity),
    };
  }, [data]);

  function addFeat(input: FeatInput) {
    setData((current) => ({
      ...current,
      feats: [{ ...input, id: makeId("feat") }, ...current.feats],
    }));
  }

  function removeFeat(id: string) {
    setData((current) => ({
      ...current,
      feats: current.feats.filter((feat) => feat.id !== id),
    }));
  }

  function addDuo(left: string, right: string) {
    if (!left.trim() || !right.trim()) return;

    setData((current) => ({
      ...current,
      duos: [
        ...current.duos,
        {
          id: makeId("duo"),
          left: left.trim(),
          right: right.trim(),
          status: null,
          markedAt: null,
          cooldownUntil: null,
        },
      ],
    }));
  }

  function removeDuo(id: string) {
    setData((current) => ({
      ...current,
      duos: current.duos.filter((duo) => duo.id !== id),
    }));
  }

  function markDuo(id: string, status: Exclude<DuoStatus, null>) {
    const markedAt = new Date();

    setData((current) => ({
      ...current,
      duos: current.duos.map((duo) =>
        duo.id === id
          ? {
              ...duo,
              status,
              markedAt: markedAt.toISOString(),
              cooldownUntil: new Date(markedAt.getTime() + duoCooldownMs).toISOString(),
            }
          : duo,
      ),
    }));
  }

  function resetDuo(id: string) {
    setData((current) => ({
      ...current,
      duos: current.duos.map((duo) =>
        duo.id === id
          ? {
              ...duo,
              status: null,
              markedAt: null,
              cooldownUntil: null,
            }
          : duo,
      ),
    }));
  }

  function saveLootSession({
    bossKey,
    player,
    lootText,
    date,
  }: {
    bossKey: string;
    player: string;
    lootText: string;
    date: string;
  }) {
    const boss = getLootBoss(bossKey);
    const parsedDrops = parseLootPaste(lootText, bossKey);

    if (!player.trim() || !parsedDrops.length) {
      return [];
    }

    const createdAt = new Date().toISOString();
    const drops: LootDrop[] = parsedDrops.map(({ drop, quantity }) => ({
      id: makeId("drop"),
      bossKey,
      bossName: boss.label,
      player: player.trim(),
      item: drop.item,
      quantity,
      category: drop.category,
      createdAt,
    }));

    const lootSummary = drops.map((drop) => `${drop.quantity}x ${drop.item}`).join(", ");

    setData((current) => ({
      ...current,
      drops: [...drops, ...current.drops],
      feats: [
        {
          id: makeId("feat"),
          type: "Boss",
          title: boss.label,
          character: player.trim(),
          world: "Rubinot",
          date,
          place: boss.mode === "duo" ? "Duo boss" : "Solo boss",
          loot: lootSummary,
          notes: "Criado pelo parser de loot.",
          difficulty: boss.mode === "duo" ? 4 : 3,
        },
        ...current.feats,
      ],
    }));

    return drops;
  }

  function undoLastLoot() {
    const firstDrop = data.drops[0];
    if (!firstDrop) return;

    const createdAt = firstDrop.createdAt;

    setData((current) => ({
      ...current,
      drops: current.drops.filter((drop) => drop.createdAt !== createdAt),
    }));
  }

  function clearAllLocalData() {
    setData(defaultData);
  }

  return {
    data,
    hasLoaded,
    stats,
    addFeat,
    removeFeat,
    addDuo,
    removeDuo,
    markDuo,
    resetDuo,
    saveLootSession,
    undoLastLoot,
    clearAllLocalData,
  };
}

export type AppDataHook = ReturnType<typeof useAppData>;
export type { Duo, Feat, LootDrop };
