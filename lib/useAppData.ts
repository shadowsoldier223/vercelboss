"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { deleteHuntImages } from "./clientImages";
import { hasCustomLocalData, makeId, normalizeAppData, normalizeTags } from "./data";
import { defaultData, duoCooldownMs, oldStorageKey, previousStorageKey, sessionKey, storageKey } from "./defaults";
import { parseHuntingAnalyser } from "./hunts";
import { getLootBoss, parseLootPaste } from "./loot";
import type { ActivityLog, AppData, AppUser, Duo, DuoStatus, Feat, HuntSession, LootBoss, LootDrop, UserRole } from "./types";

type FeatInput = Omit<Feat, "id">;
type HuntInput = Omit<HuntSession, "id" | "userId" | "userName" | "createdAt">;
type HuntPatch = Partial<Pick<HuntSession, "title" | "character" | "date" | "notes" | "rawText" | "images" | "tags">>;
type UserInput = { username: string; password: string; role: UserRole };
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

        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
        const sessionPayload = sessionResponse?.ok ? ((await sessionResponse.json()) as { user?: AppUser | null }) : null;
        const storedSession = window.localStorage.getItem(sessionKey);
        const storedUser = nextData.users.find((user) => user.id === storedSession);
        const fallbackUser = storedUser ? { id: storedUser.id, username: storedUser.username, role: storedUser.role } : null;

        if (!cancelled) {
          setData(nextData);
          setCurrentUser(sessionPayload?.user ?? fallbackUser);
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
    if (!hasLoaded || !currentUser || !remoteEnabled || (!remoteSyncAllowed && !hasCustomLocalData(data))) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            setRemoteEnabled(false);
            return;
          }

          const payload = (await response.json()) as { data?: Partial<AppData> };
          const synced = payload.data ? normalizeAppData(payload.data) : null;

          if (synced && JSON.stringify(synced) !== JSON.stringify(data)) {
            setData(synced);
          }

          setRemoteSyncAllowed(true);
        })
        .catch(() => setRemoteEnabled(false));
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [currentUser, data, hasLoaded, remoteEnabled, remoteSyncAllowed]);

  useEffect(() => {
    if (!hasLoaded || !currentUser) return;

    const freshUser = data.users.find((user) => user.id === currentUser.id);

    if (!freshUser) {
      setCurrentUser(null);
      window.localStorage.removeItem(sessionKey);
      return;
    }

    if (freshUser.username !== currentUser.username || freshUser.role !== currentUser.role) {
      setCurrentUser({
        id: freshUser.id,
        username: freshUser.username,
        role: freshUser.role,
      });
    }
  }, [currentUser, data.users, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;

    async function syncSession() {
      const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      const payload = response?.ok ? ((await response.json()) as { user?: AppUser | null }) : null;

      setCurrentUser(payload?.user ?? null);
    }

    function handleStorage() {
      void syncSession();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(sessionEventName, syncSession);

    return () => {
      window.removeEventListener("storage", handleStorage);
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

  function createActivity(action: string, target: string, details: string): ActivityLog {
    return {
      id: makeId("activity"),
      actorId: currentUser?.id ?? "system",
      actorName: currentUser?.username ?? "Sistema",
      action,
      target,
      details,
      createdAt: new Date().toISOString(),
    };
  }

  function withActivity(current: AppData, patch: Partial<AppData>, action: string, target: string, details: string): AppData {
    return {
      ...current,
      ...patch,
      activityLogs: [createActivity(action, target, details), ...current.activityLogs].slice(0, 250),
    };
  }

  function canManageHunt(hunt: HuntSession) {
    return Boolean(currentUser && (isAdmin || hunt.userId === currentUser.id));
  }

  async function login(username: string, password: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);

    if (!response?.ok) return false;

    const payload = (await response.json()) as { user?: AppUser };
    const user = payload.user;

    if (!user) return false;

    setCurrentUser(user);
    window.localStorage.setItem(sessionKey, user.id);
    window.dispatchEvent(new Event(sessionEventName));
    return true;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setCurrentUser(null);
    window.localStorage.removeItem(sessionKey);
    window.dispatchEvent(new Event(sessionEventName));
  }

  function removeFeat(id: string) {
    if (!isAdmin) return;

    setData((current) => {
      const feat = current.feats.find((entry) => entry.id === id);

      if (!feat) return current;

      return withActivity(
        current,
        { feats: current.feats.filter((entry) => entry.id !== id) },
        "removeu",
        "Atividade",
        feat.title,
      );
    });
  }

  function updateFeat(id: string, patch: Partial<FeatInput>) {
    if (!isAdmin) return;

    setData((current) => {
      const feat = current.feats.find((entry) => entry.id === id);

      if (!feat) return current;

      return withActivity(
        current,
        { feats: current.feats.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)) },
        "editou",
        "Atividade",
        patch.title?.trim() || feat.title,
      );
    });
  }

  function addDuo(left: string, right: string) {
    if (!isAdmin || !left.trim() || !right.trim()) return;

    const leftName = left.trim();
    const rightName = right.trim();

    setData((current) =>
      withActivity(
        current,
        {
          duos: [
            ...current.duos,
            {
              id: makeId("duo"),
              left: leftName,
              right: rightName,
              status: null,
              markedAt: null,
              cooldownUntil: null,
            },
          ],
        },
        "criou",
        "Duo",
        `${leftName} + ${rightName}`,
      ),
    );
  }

  function removeDuo(id: string) {
    if (!isAdmin) return;

    setData((current) => {
      const duo = current.duos.find((entry) => entry.id === id);

      if (!duo) return current;

      return withActivity(
        current,
        { duos: current.duos.filter((entry) => entry.id !== id) },
        "removeu",
        "Duo",
        `${duo.left} + ${duo.right}`,
      );
    });
  }

  function updateDuo(id: string, patch: Partial<Pick<Duo, "left" | "right">>) {
    if (!isAdmin) return;

    setData((current) => {
      const duo = current.duos.find((entry) => entry.id === id);

      if (!duo) return current;

      const nextLeft = patch.left?.trim() || duo.left;
      const nextRight = patch.right?.trim() || duo.right;

      return withActivity(
        current,
        {
          duos: current.duos.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  left: nextLeft,
                  right: nextRight,
                }
              : entry,
          ),
        },
        "editou",
        "Duo",
        `${nextLeft} + ${nextRight}`,
      );
    });
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

      return withActivity(
        current,
        {
          lootBosses: [
            ...current.lootBosses,
            {
              key,
              label,
              mode: input.mode,
              drops: [],
            },
          ],
        },
        "criou",
        "Boss",
        label,
      );
    });

    return true;
  }

  function updateLootBoss(key: string, patch: Partial<LootBossInput>) {
    if (!isAdmin) return;

    setData((current) => {
      const boss = current.lootBosses.find((entry) => entry.key === key);

      if (!boss) return current;

      const nextLabel = patch.label !== undefined ? patch.label.trim() || boss.label : boss.label;
      const nextMode = patch.mode ?? boss.mode;

      return withActivity(
        current,
        {
          lootBosses: current.lootBosses.map((entry) =>
            entry.key === key
              ? {
                  ...entry,
                  label: nextLabel,
                  mode: nextMode,
                }
              : entry,
          ),
        },
        "editou",
        "Boss",
        nextLabel,
      );
    });
  }

  function removeLootBoss(key: string) {
    if (!isAdmin) return;

    setData((current) => {
      const boss = current.lootBosses.find((entry) => entry.key === key);

      if (!boss) return current;

      return withActivity(
        current,
        { lootBosses: current.lootBosses.filter((entry) => entry.key !== key) },
        "removeu",
        "Boss",
        boss.label,
      );
    });
  }

  function markDuo(id: string, status: Exclude<DuoStatus, null>) {
    if (!isAdmin) return;

    const markedAt = new Date();

    setData((current) => {
      const duo = current.duos.find((entry) => entry.id === id);

      if (!duo) return current;

      return withActivity(
        current,
        {
          duos: current.duos.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  status,
                  markedAt: markedAt.toISOString(),
                  cooldownUntil: new Date(markedAt.getTime() + duoCooldownMs).toISOString(),
                }
              : entry,
          ),
        },
        "marcou",
        "Duo",
        `${duo.left} + ${duo.right}: ${status === "done" ? "pronto" : "fail"}`,
      );
    });
  }

  function resetDuo(id: string) {
    if (!isAdmin) return;

    setData((current) => {
      const duo = current.duos.find((entry) => entry.id === id);

      if (!duo) return current;

      return withActivity(
        current,
        {
          duos: current.duos.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  status: null,
                  markedAt: null,
                  cooldownUntil: null,
                }
              : entry,
          ),
        },
        "resetou",
        "Duo",
        `${duo.left} + ${duo.right}`,
      );
    });
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
    const playerName = player.trim();

    if (!playerName || !parsedDrops.length) {
      return [];
    }

    const createdAt = new Date().toISOString();
    const drops: LootDrop[] = parsedDrops.map(({ drop, quantity }) => ({
      id: makeId("drop"),
      bossKey,
      bossName: boss.label,
      player: playerName,
      item: drop.item,
      quantity,
      category: drop.category,
      createdAt,
    }));

    const lootSummary = drops.map((drop) => `${drop.quantity}x ${drop.item}`).join(", ");

    setData((current) =>
      withActivity(
        current,
        {
          drops: [...drops, ...current.drops],
          feats: [
            {
              id: makeId("feat"),
              type: "Boss",
              title: boss.label,
              character: playerName,
              world: "Rubinot",
              date,
              place: boss.mode === "duo" ? "Duo boss" : "Solo boss",
              loot: lootSummary,
              notes: "Criado pelo parser de loot.",
            },
            ...current.feats,
          ],
        },
        "salvou",
        "Loot",
        `${boss.label} para ${playerName}`,
      ),
    );

    return drops;
  }

  function undoLastLoot() {
    if (!isAdmin) return;

    const firstDrop = data.drops[0];
    if (!firstDrop) return;

    const createdAt = firstDrop.createdAt;

    setData((current) =>
      withActivity(
        current,
        { drops: current.drops.filter((drop) => drop.createdAt !== createdAt) },
        "desfez",
        "Loot",
        `${firstDrop.bossName} de ${firstDrop.player}`,
      ),
    );
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
      tags: normalizeTags(input.tags),
      createdAt: new Date().toISOString(),
    };
    const result = hunt.balance
      ? `Balance ${hunt.balance.toLocaleString("pt-BR")}`
      : hunt.loot
        ? `Loot ${hunt.loot.toLocaleString("pt-BR")}`
        : "Hunting Analyser salvo";

    setData((current) =>
      withActivity(
        current,
        {
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
        },
        "registrou",
        "Hunt",
        `${title} (${character})`,
      ),
    );

    return hunt;
  }

  function removeHunt(id: string) {
    const hunt = data.hunts.find((entry) => entry.id === id);

    if (!hunt || !canManageHunt(hunt)) return;

    void deleteHuntImages(hunt.images);

    setData((current) =>
      withActivity(
        current,
        { hunts: current.hunts.filter((entry) => entry.id !== id) },
        "removeu",
        "Hunt",
        `${hunt.title} (${hunt.character})`,
      ),
    );
  }

  function updateHunt(id: string, patch: HuntPatch) {
    const existing = data.hunts.find((entry) => entry.id === id);

    if (!existing || !canManageHunt(existing)) return;

    setData((current) => {
      let updatedTitle = existing.title;

      const hunts = current.hunts.map((hunt) => {
        if (hunt.id !== id) return hunt;

        const rawText = patch.rawText ?? hunt.rawText;
        const parsed = patch.rawText === undefined ? {} : parseHuntingAnalyser(rawText);

        const updated = {
          ...hunt,
          ...patch,
          ...parsed,
          rawText,
          title: patch.title !== undefined ? patch.title.trim() || "Hunt registrada" : hunt.title,
          character: patch.character !== undefined ? patch.character.trim() || hunt.userName : hunt.character,
          notes: patch.notes !== undefined ? patch.notes.trim() : hunt.notes,
          tags: patch.tags !== undefined ? normalizeTags(patch.tags) : hunt.tags,
          images: patch.images !== undefined ? patch.images : hunt.images,
        };

        updatedTitle = updated.title;

        return updated;
      });

      return withActivity(current, { hunts }, "editou", "Hunt", updatedTitle);
    });
  }

  function addUser(input: UserInput) {
    if (!isAdmin || !input.username.trim() || !input.password.trim()) return false;

    const username = input.username.trim();
    const alreadyExists = data.users.some((user) => user.username.toLowerCase() === username.toLowerCase());

    if (alreadyExists) return false;

    setData((current) =>
      withActivity(
        current,
        {
          users: [
            ...current.users,
            {
              id: makeId("user"),
              username,
              password: input.password,
              role: input.role,
            },
          ],
        },
        "criou",
        "Usuario",
        username,
      ),
    );

    return true;
  }

  function updateUser(id: string, patch: Partial<Pick<AppUser, "password" | "role">>) {
    if (!isAdmin) return;

    setData((current) => {
      const user = current.users.find((entry) => entry.id === id);

      if (!user) return current;

      const cleanPatch: Partial<Pick<AppUser, "password" | "role">> = {};

      if (patch.password?.trim()) {
        cleanPatch.password = patch.password.trim();
      }

      if (patch.role) {
        cleanPatch.role = patch.role;
      }

      if (!cleanPatch.password && !cleanPatch.role) return current;

      return withActivity(
        current,
        { users: current.users.map((entry) => (entry.id === id ? { ...entry, ...cleanPatch } : entry)) },
        "editou",
        "Usuario",
        user.username,
      );
    });
  }

  function removeUser(id: string) {
    if (!isAdmin || currentUser?.id === id) return;

    setData((current) => {
      const user = current.users.find((entry) => entry.id === id);

      if (!user) return current;

      return withActivity(
        current,
        { users: current.users.filter((entry) => entry.id !== id) },
        "removeu",
        "Usuario",
        user.username,
      );
    });
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
