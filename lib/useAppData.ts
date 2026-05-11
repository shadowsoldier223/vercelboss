"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultData, duoCooldownMs, oldStorageKey, previousStorageKey, sessionKey, storageKey } from "./defaults";
import { parseHuntingAnalyser } from "./hunts";
import { getLootBoss, parseLootPaste } from "./loot";
import type { AppData, AppUser, Duo, DuoStatus, Feat, HuntSession, LootDrop, UserRole } from "./types";

type FeatInput = Omit<Feat, "id">;
type HuntInput = Omit<HuntSession, "id" | "userId" | "userName" | "createdAt">;
type UserInput = Omit<AppUser, "id">;
const sessionEventName = "closedboss-session-change";

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeData(data: Partial<AppData> | null): AppData {
  return {
    feats: Array.isArray(data?.feats) ? data.feats : defaultData.feats,
    duos: Array.isArray(data?.duos) ? data.duos : defaultData.duos,
    drops: Array.isArray(data?.drops) ? data.drops : [],
    users: Array.isArray(data?.users) && data.users.length ? data.users : defaultData.users,
    hunts: Array.isArray(data?.hunts) ? data.hunts : [],
  };
}

function readStoredData(): AppData {
  const stored = window.localStorage.getItem(storageKey);

  if (stored) {
    return normalizeData(JSON.parse(stored) as Partial<AppData>);
  }

  const previousStored = window.localStorage.getItem(previousStorageKey);

  if (previousStored) {
    return normalizeData(JSON.parse(previousStored) as Partial<AppData>);
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
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedData = readStoredData();
      const storedSession = window.localStorage.getItem(sessionKey);

      setData(storedData);
      setCurrentUser(storedData.users.find((user) => user.id === storedSession) ?? null);
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

  useEffect(() => {
    if (!hasLoaded || !currentUser) return;

    const freshUser = data.users.find((user) => user.id === currentUser.id);

    if (!freshUser) {
      setCurrentUser(null);
      window.localStorage.removeItem(sessionKey);
      return;
    }

    if (
      freshUser.username !== currentUser.username ||
      freshUser.password !== currentUser.password ||
      freshUser.role !== currentUser.role
    ) {
      setCurrentUser(freshUser);
    }
  }, [currentUser, data.users, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;

    function syncSession() {
      const storedSession = window.localStorage.getItem(sessionKey);
      setCurrentUser(data.users.find((user) => user.id === storedSession) ?? null);
    }

    window.addEventListener("storage", syncSession);
    window.addEventListener(sessionEventName, syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(sessionEventName, syncSession);
    };
  }, [data.users, hasLoaded]);

  const isAdmin = currentUser?.role === "admin";

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
      registeredHunts: data.hunts.length,
      huntBalance: data.hunts.reduce((total, hunt) => total + hunt.balance, 0),
      itemTotals: Array.from(itemTotals.values()).sort((a, b) => b.quantity - a.quantity),
      characterTotals: Array.from(characterTotals.values()).sort((a, b) => b.quantity - a.quantity),
    };
  }, [data]);

  function login(username: string, password: string) {
    const normalizedUsername = username.trim().toLowerCase();
    const user = data.users.find(
      (entry) => entry.username.toLowerCase() === normalizedUsername && entry.password === password,
    );

    if (!user) return false;

    setCurrentUser(user);
    window.localStorage.setItem(sessionKey, user.id);
    window.dispatchEvent(new Event(sessionEventName));
    return true;
  }

  function logout() {
    setCurrentUser(null);
    window.localStorage.removeItem(sessionKey);
    window.dispatchEvent(new Event(sessionEventName));
  }

  function addFeat(input: FeatInput) {
    if (!currentUser) return;

    setData((current) => ({
      ...current,
      feats: [{ ...input, id: makeId("feat") }, ...current.feats],
    }));
  }

  function removeFeat(id: string) {
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      feats: current.feats.filter((feat) => feat.id !== id),
    }));
  }

  function updateFeat(id: string, patch: Partial<FeatInput>) {
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      feats: current.feats.map((feat) => (feat.id === id ? { ...feat, ...patch } : feat)),
    }));
  }

  function addDuo(left: string, right: string) {
    if (!isAdmin || !left.trim() || !right.trim()) return;

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
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      duos: current.duos.filter((duo) => duo.id !== id),
    }));
  }

  function updateDuo(id: string, patch: Partial<Pick<Duo, "left" | "right">>) {
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      duos: current.duos.map((duo) => (duo.id === id ? { ...duo, ...patch } : duo)),
    }));
  }

  function markDuo(id: string, status: Exclude<DuoStatus, null>) {
    if (!isAdmin) return;

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
    if (!isAdmin) return;

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
    if (!currentUser) return [];

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
    if (!isAdmin) return;

    const firstDrop = data.drops[0];
    if (!firstDrop) return;

    const createdAt = firstDrop.createdAt;

    setData((current) => ({
      ...current,
      drops: current.drops.filter((drop) => drop.createdAt !== createdAt),
    }));
  }

  function saveHuntSession(input: HuntInput) {
    if (!currentUser || !input.rawText.trim()) return null;

    const parsed = parseHuntingAnalyser(input.rawText);
    const title = input.title.trim() || "Hunt registrada";
    const character = input.character.trim() || currentUser.username;
    const notes = input.notes.trim();
    const hunt: HuntSession = {
      ...input,
      ...parsed,
      id: makeId("hunt"),
      userId: currentUser.id,
      userName: currentUser.username,
      title,
      character,
      notes,
      createdAt: new Date().toISOString(),
    };
    const result = hunt.balance
      ? `Balance ${hunt.balance.toLocaleString("pt-BR")}`
      : hunt.loot
        ? `Loot ${hunt.loot.toLocaleString("pt-BR")}`
        : "Hunting Analyser salvo";

    setData((current) => ({
      ...current,
      hunts: [hunt, ...current.hunts],
      feats: [
        {
          id: makeId("feat"),
          type: "Hunt",
          title,
          character,
          world: "",
          date: input.date,
          place: "",
          loot: result,
          notes: notes || `Sessao ${hunt.duration || "sem tempo informado"}.`,
          difficulty: 3,
        },
        ...current.feats,
      ],
    }));

    return hunt;
  }

  function removeHunt(id: string) {
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      hunts: current.hunts.filter((hunt) => hunt.id !== id),
    }));
  }

  function addUser(input: UserInput) {
    if (!isAdmin || !input.username.trim() || !input.password.trim()) return false;

    const username = input.username.trim();
    const alreadyExists = data.users.some((user) => user.username.toLowerCase() === username.toLowerCase());

    if (alreadyExists) return false;

    setData((current) => ({
      ...current,
      users: [
        ...current.users,
        {
          id: makeId("user"),
          username,
          password: input.password,
          role: input.role,
        },
      ],
    }));

    return true;
  }

  function updateUser(id: string, patch: Partial<Pick<AppUser, "password" | "role">>) {
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      users: current.users.map((user) => (user.id === id ? { ...user, ...patch } : user)),
    }));
  }

  function removeUser(id: string) {
    if (!isAdmin || currentUser?.id === id) return;

    setData((current) => ({
      ...current,
      users: current.users.filter((user) => user.id !== id),
    }));
  }

  function clearAllLocalData() {
    if (!isAdmin) return;

    setData(defaultData);
  }

  return {
    data,
    hasLoaded,
    currentUser,
    isAdmin,
    stats,
    login,
    logout,
    addFeat,
    removeFeat,
    updateFeat,
    addDuo,
    removeDuo,
    updateDuo,
    markDuo,
    resetDuo,
    saveLootSession,
    undoLastLoot,
    saveHuntSession,
    removeHunt,
    addUser,
    updateUser,
    removeUser,
    clearAllLocalData,
  };
}

export type AppDataHook = ReturnType<typeof useAppData>;
export type { AppUser, Duo, Feat, HuntSession, LootDrop, UserRole };
