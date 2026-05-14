"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { hasCustomLocalData, makeId, normalizeAppData } from "./data";
import { defaultData, duoCooldownMs, oldStorageKey, previousStorageKey, sessionKey, storageKey } from "./defaults";
import { parseHuntingAnalyser } from "./hunts";
import { getLootBoss, parseLootPaste } from "./loot";
import type { AppData, AppUser, Duo, DuoStatus, Feat, HuntSession, LootBoss, LootDrop, UserRole } from "./types";

type FeatInput = Omit<Feat, "id">;
type HuntInput = Omit<HuntSession, "id" | "userId" | "userName" | "createdAt">;
type HuntPatch = Partial<Pick<HuntSession, "title" | "character" | "date" | "notes" | "rawText">>;
type UserInput = Omit<AppUser, "id">;
type LootBossInput = Pick<LootBoss, "label" | "mode">;
const sessionEventName = "closedboss-session-change";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "boss";
}

function readStoredData(): AppData {
  const stored = window.localStorage.getItem(storageKey);

  if (stored) {
    return normalizeAppData(JSON.parse(stored) as Partial<AppData>);
  }

  const previousStored = window.localStorage.getItem(previousStorageKey);

  if (previousStored) {
    return normalizeAppData(JSON.parse(previousStored) as Partial<AppData>);
  }

  const oldFeats = window.localStorage.getItem(oldStorageKey);

  if (oldFeats) {
    return normalizeAppData({
      ...defaultData,
      feats: JSON.parse(oldFeats) as Feat[],
    });
  }

  return defaultData;
}

function useAppDataState() {
  const [data, setData] = useState<AppData>(defaultData);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteSyncAllowed, setRemoteSyncAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const localData = readStoredData();
        let nextData = localData;

        try {
          const response = await fetch("/api/state", { cache: "no-store" });

          if (response.ok) {
            const payload = (await response.json()) as {
              data?: Partial<AppData>;
              initialized?: boolean;
              remote?: boolean;
            };
            const hasRemoteStore = Boolean(payload.remote);

            setRemoteEnabled(hasRemoteStore);
            setRemoteSyncAllowed(Boolean(hasRemoteStore && payload.initialized));

            if (!hasRemoteStore) {
              nextData = localData;
            } else if (payload.initialized === false && hasCustomLocalData(localData)) {
              await fetch("/api/state", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(localData),
              });
              setRemoteSyncAllowed(true);
              nextData = localData;
            } else {
              nextData = normalizeAppData(payload.data ?? null);
            }
          }
        } catch {
          setRemoteEnabled(false);
        }

        const storedSession = window.localStorage.getItem(sessionKey);

        if (!cancelled) {
          setData(nextData);
          setCurrentUser(nextData.users.find((user) => user.id === storedSession) ?? null);
        }
      } catch {
        if (!cancelled) {
          setData(defaultData);
        }
      }

      if (!cancelled) {
        setHasLoaded(true);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      return;
    }
  }, [data, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded || !remoteEnabled || (!remoteSyncAllowed && !hasCustomLocalData(data))) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            setRemoteEnabled(false);
            return;
          }

          setRemoteSyncAllowed(true);
        })
        .catch(() => setRemoteEnabled(false));
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [data, hasLoaded, remoteEnabled, remoteSyncAllowed]);

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
      duos: data.duos.length,
      drops: data.drops.length,
      lootBosses: data.lootBosses.length,
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

  function addLootBoss(input: LootBossInput) {
    if (!isAdmin || !input.label.trim()) return false;

    const label = input.label.trim();
    const baseKey = slugify(label);
    const alreadyExists = data.lootBosses.some((boss) => boss.label.toLowerCase() === label.toLowerCase());

    if (alreadyExists) return false;

    setData((current) => {
      const keys = new Set(current.lootBosses.map((boss) => boss.key));
      let key = baseKey;
      let index = 2;

      while (keys.has(key)) {
        key = `${baseKey}-${index}`;
        index += 1;
      }

      return {
        ...current,
        lootBosses: [
          ...current.lootBosses,
          {
            key,
            label,
            mode: input.mode,
            drops: [],
          },
        ],
      };
    });

    return true;
  }

  function updateLootBoss(key: string, patch: Partial<LootBossInput>) {
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      lootBosses: current.lootBosses.map((boss) =>
        boss.key === key
          ? {
              ...boss,
              ...patch,
              label: patch.label !== undefined ? patch.label.trim() || boss.label : boss.label,
            }
          : boss,
      ),
    }));
  }

  function removeLootBoss(key: string) {
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      lootBosses: current.lootBosses.filter((boss) => boss.key !== key),
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

    const bosses = data.lootBosses;
    const boss = getLootBoss(bossKey, bosses);

    if (!boss) return [];

    const parsedDrops = parseLootPaste(lootText, bossKey, bosses);

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
      images: input.images ?? [],
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

  function updateHunt(id: string, patch: HuntPatch) {
    if (!isAdmin) return;

    setData((current) => ({
      ...current,
      hunts: current.hunts.map((hunt) => {
        if (hunt.id !== id) return hunt;

        const rawText = patch.rawText ?? hunt.rawText;
        const parsed = patch.rawText === undefined ? {} : parseHuntingAnalyser(rawText);

        return {
          ...hunt,
          ...patch,
          ...parsed,
          rawText,
          title: patch.title !== undefined ? patch.title.trim() || "Hunt registrada" : hunt.title,
          character: patch.character !== undefined ? patch.character.trim() || hunt.userName : hunt.character,
          notes: patch.notes !== undefined ? patch.notes.trim() : hunt.notes,
        };
      }),
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

  return {
    data,
    hasLoaded,
    currentUser,
    isAdmin,
    stats,
    login,
    logout,
    removeFeat,
    updateFeat,
    addDuo,
    removeDuo,
    updateDuo,
    addLootBoss,
    updateLootBoss,
    removeLootBoss,
    markDuo,
    resetDuo,
    saveLootSession,
    undoLastLoot,
    saveHuntSession,
    removeHunt,
    updateHunt,
    addUser,
    updateUser,
    removeUser,
  };
}

export type AppDataHook = ReturnType<typeof useAppDataState>;

const AppDataContext = createContext<AppDataHook | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const value = useAppDataState();

  return createElement(AppDataContext.Provider, { value }, children);
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData precisa estar dentro de AppDataProvider.");
  }

  return context;
}

export type { AppUser, Duo, Feat, HuntSession, LootBoss, LootDrop, UserRole };
