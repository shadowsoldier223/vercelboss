"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { deleteHuntImages } from "./clientImages";
import { hasCustomLocalData, makeId, normalizeAppData, normalizeTags } from "./data";
import { defaultData, duoCooldownMs, oldStorageKey, previousStorageKey, sessionKey, storageKey } from "./defaults";
import { parseHuntingAnalyser } from "./hunts";
import { getLootBoss, parseLootPaste } from "./loot";
import type {
  ActivityChange,
  ActivityLog,
  ActivityMeta,
  AppData,
  AppUser,
  Duo,
  DuoStatus,
  Feat,
  HuntSession,
  LootBoss,
  LootDrop,
  UserRole,
} from "./types";

type FeatInput = Omit<Feat, "id">;
type HuntInput = Omit<HuntSession, "id" | "userId" | "userName" | "createdAt">;
type HuntPatch = Partial<Pick<HuntSession, "title" | "character" | "date" | "notes" | "rawText" | "images" | "tags">>;
type UserInput = { username: string; password: string; role: UserRole };
type LootBossInput = Pick<LootBoss, "label" | "mode">;
type ActivityOptions = {
  targetId?: string;
  metadata?: ActivityMeta[];
  changes?: ActivityChange[];
};
const sessionEventName = "closedboss-session-change";

function logValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "vazio";
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  if (typeof value === "boolean") return value ? "sim" : "nao";
  if (value === null || value === undefined || value === "") return "vazio";

  return String(value);
}

function meta(label: string, value: unknown): ActivityMeta {
  return { label, value: logValue(value) };
}

function change(field: string, before: unknown, after: unknown): ActivityChange | null {
  const previous = logValue(before);
  const next = logValue(after);

  if (previous === next) return null;

  return { field, before: previous, after: next };
}

function compactChanges(changes: Array<ActivityChange | null>) {
  return changes.filter((entry): entry is ActivityChange => Boolean(entry));
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
  const dataRef = useRef(data);
  const dataVersionRef = useRef(0);
  const syncPendingRef = useRef(false);
  const syncQueueRef = useRef(Promise.resolve());
  const syncCountRef = useRef(0);

  useEffect(() => {
    dataRef.current = data;
    dataVersionRef.current += 1;
  }, [data]);

  const refreshData = useCallback(async () => {
    if (syncPendingRef.current) return false;

    const response = await fetch("/api/state", { cache: "no-store" }).catch(() => null);

    if (!response?.ok) return false;

    const payload = (await response.json()) as {
      data?: Partial<AppData>;
      initialized?: boolean;
      remote?: boolean;
    };
    const hasRemoteStore = Boolean(payload.remote);

    setRemoteEnabled(hasRemoteStore);
    setRemoteSyncAllowed(Boolean(hasRemoteStore && payload.initialized));

    if (!hasRemoteStore) return false;

    const nextData = normalizeAppData(payload.data ?? null);

    setData((current) => (JSON.stringify(current) === JSON.stringify(nextData) ? current : nextData));

    return true;
  }, []);

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
        if (!cancelled) {
          setData(nextData);
          setCurrentUser(sessionPayload?.user ?? null);

          if (!sessionPayload?.user) {
            window.localStorage.removeItem(sessionKey);
          }
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

    const sentVersion = dataVersionRef.current;
    const snapshot = data;

    syncCountRef.current += 1;
    syncPendingRef.current = true;

    const write = async () => {
      try {
        const response = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });

        if (!response.ok) {
          throw new Error("Nao foi possivel sincronizar os dados.");
        }

        const payload = (await response.json()) as { data?: Partial<AppData> };
        const synced = payload.data ? normalizeAppData(payload.data) : null;

        if (synced && sentVersion === dataVersionRef.current && JSON.stringify(synced) !== JSON.stringify(dataRef.current)) {
          setData(synced);
        }

        setRemoteSyncAllowed(true);
      } catch {
        setRemoteEnabled(false);
      } finally {
        syncCountRef.current -= 1;
        syncPendingRef.current = syncCountRef.current > 0;
      }
    };

    syncQueueRef.current = syncQueueRef.current.catch(() => undefined).then(write);
    void syncQueueRef.current;
  }, [currentUser, data, hasLoaded, remoteEnabled, remoteSyncAllowed]);

  useEffect(() => {
    if (!hasLoaded || !currentUser || !remoteEnabled) return;

    function refreshVisibleData() {
      void refreshData();
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshData();
      }
    }

    const interval = window.setInterval(refreshVisibleData, 10000);

    window.addEventListener("focus", refreshVisibleData);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisibleData);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [currentUser, hasLoaded, refreshData, remoteEnabled]);

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
    return {
      totalFeats: data.feats.length,
      duos: data.duos.length,
      drops: data.drops.length,
      lootBosses: data.lootBosses.length,
      registeredHunts: data.hunts.length,
      huntBalance: data.hunts.reduce((total, hunt) => total + hunt.balance, 0),
    };
  }, [data]);

  function createActivity(action: string, target: string, details: string, options: ActivityOptions = {}): ActivityLog {
    return {
      id: makeId("activity"),
      actorId: currentUser?.id ?? "system",
      actorName: currentUser?.username ?? "Sistema",
      action,
      target,
      targetId: options.targetId,
      details,
      metadata: options.metadata?.filter((entry) => entry.value !== "vazio"),
      changes: options.changes?.filter((entry) => entry.before !== entry.after),
      createdAt: new Date().toISOString(),
    };
  }

  function withActivity(
    current: AppData,
    patch: Partial<AppData>,
    action: string,
    target: string,
    details: string,
    options: ActivityOptions = {},
  ): AppData {
    return {
      ...current,
      ...patch,
      activityLogs: [createActivity(action, target, details, options), ...current.activityLogs].slice(0, 250),
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
        {
          targetId: feat.id,
          metadata: [meta("Tipo", feat.type), meta("Personagem", feat.character), meta("Data", feat.date), meta("Loot", feat.loot)],
        },
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
        {
          targetId: feat.id,
          metadata: [meta("Tipo", feat.type), meta("Personagem", patch.character ?? feat.character), meta("Data", patch.date ?? feat.date)],
          changes: compactChanges([
            change("Titulo", feat.title, patch.title ?? feat.title),
            change("Personagem", feat.character, patch.character ?? feat.character),
            change("Loot", feat.loot, patch.loot ?? feat.loot),
            change("Notas", feat.notes, patch.notes ?? feat.notes),
          ]),
        },
      );
    });
  }

  function addDuo(left: string, right: string): { ok: boolean; error?: string } {
    if (!isAdmin) return { ok: false, error: "Somente administradores podem adicionar duos." };

    const leftName = left.trim();
    const rightName = right.trim();

    if (!leftName || !rightName) return { ok: false, error: "Preencha os dois jogadores." };
    if (leftName.toLowerCase() === rightName.toLowerCase()) {
      return { ok: false, error: "Os dois jogadores precisam ser diferentes." };
    }

    const pairKey = [leftName, rightName].map((name) => name.toLowerCase()).sort().join("|");
    const alreadyExists = data.duos.some(
      (duo) => [duo.left, duo.right].map((name) => name.toLowerCase()).sort().join("|") === pairKey,
    );

    if (alreadyExists) return { ok: false, error: "Essa dupla ja esta cadastrada." };

    setData((current) => {
      const newDuo = {
        id: makeId("duo"),
        left: leftName,
        right: rightName,
        status: null,
        markedAt: null,
        cooldownUntil: null,
      };

      return withActivity(
        current,
        { duos: [...current.duos, newDuo] },
        "criou",
        "Duo",
        `${leftName} + ${rightName}`,
        {
          targetId: newDuo.id,
          metadata: [meta("Jogador 1", leftName), meta("Jogador 2", rightName), meta("Cooldown", "20h")],
        },
      );
    });

    return { ok: true };
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
        {
          targetId: duo.id,
          metadata: [meta("Jogador 1", duo.left), meta("Jogador 2", duo.right), meta("Status anterior", duo.status ?? "pronto")],
        },
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
        {
          targetId: duo.id,
          metadata: [meta("Status", duo.status ?? "pronto"), meta("Cooldown ate", duo.cooldownUntil ?? "")],
          changes: compactChanges([change("Jogador 1", duo.left, nextLeft), change("Jogador 2", duo.right, nextRight)]),
        },
      );
    });
  }

  async function addLootBoss(input: LootBossInput) {
    if (!isAdmin || !input.label.trim()) return false;

    const response = await fetch("/api/bosses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).catch(() => null);
    const payload = response?.ok ? ((await response.json()) as { boss?: LootBoss }) : null;
    const boss = payload?.boss;

    if (!boss) return false;

    setData((current) =>
      withActivity(
        current,
        { lootBosses: [...current.lootBosses, boss] },
        "criou",
        "Boss",
        boss.label,
        {
          targetId: boss.key,
          metadata: [meta("Tipo", boss.mode === "duo" ? "Duo" : "Solo"), meta("Chave", boss.key)],
        },
      ),
    );

    return true;
  }

  async function updateLootBoss(key: string, patch: Partial<LootBossInput>) {
    if (!isAdmin) return false;

    const response = await fetch("/api/bosses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, patch }),
    }).catch(() => null);
    const payload = response?.ok ? ((await response.json()) as { boss?: LootBoss }) : null;
    const updated = payload?.boss;

    if (!updated) return false;

    setData((current) => {
      const boss = current.lootBosses.find((entry) => entry.key === key);

      if (!boss) return current;

      return withActivity(
        current,
        {
          lootBosses: current.lootBosses.map((entry) =>
            entry.key === key
              ? {
                  ...entry,
                  ...updated,
                }
              : entry,
          ),
        },
        "editou",
        "Boss",
        updated.label,
        {
          targetId: key,
          metadata: [meta("Chave", key)],
          changes: compactChanges([change("Nome", boss.label, updated.label), change("Tipo", boss.mode, updated.mode)]),
        },
      );
    });

    return true;
  }

  async function removeLootBoss(key: string) {
    if (!isAdmin) return false;

    const response = await fetch("/api/bosses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
      keepalive: true,
    }).catch(() => null);

    if (!response?.ok) return false;

    setData((current) => {
      const boss = current.lootBosses.find((entry) => entry.key === key);

      if (!boss) return current;

      return withActivity(
        current,
        { lootBosses: current.lootBosses.filter((entry) => entry.key !== key) },
        "removeu",
        "Boss",
        boss.label,
        {
          targetId: boss.key,
          metadata: [meta("Tipo", boss.mode === "duo" ? "Duo" : "Solo"), meta("Chave", boss.key)],
        },
      );
    });

    return true;
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
        `${duo.left} + ${duo.right}: ${status === "done" ? "OK" : "fail"}`,
        {
          targetId: duo.id,
          metadata: [
            meta("Jogador 1", duo.left),
            meta("Jogador 2", duo.right),
            meta("Novo status", status === "done" ? "OK" : "fail"),
            meta("Cooldown", new Date(markedAt.getTime() + duoCooldownMs).toISOString()),
          ],
          changes: compactChanges([change("Status", duo.status ?? "sem marca", status === "done" ? "OK" : "fail")]),
        },
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
        {
          targetId: duo.id,
          metadata: [meta("Jogador 1", duo.left), meta("Jogador 2", duo.right), meta("Cooldown anterior", duo.cooldownUntil ?? "")],
          changes: compactChanges([change("Status", duo.status ?? "sem marca", "sem marca")]),
        },
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
      userId: currentUser.id,
      userName: currentUser.username,
      player: playerName,
      item: drop.item,
      quantity,
      category: drop.category,
      date,
      createdAt,
    }));

    const lootSummary = drops.map((drop) => `${drop.quantity}x ${drop.item}`).join(", ");
    const totalQuantity = drops.reduce((total, drop) => total + drop.quantity, 0);

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
        {
          targetId: createdAt,
          metadata: [
            meta("Boss", boss.label),
            meta("Personagem", playerName),
            meta("Data", date),
            meta("Itens diferentes", drops.length),
            meta("Quantidade total", totalQuantity),
          ],
        },
      ),
    );

    return drops;
  }

  function removeLootSession(createdAt: string) {
    if (!isAdmin) return;

    const sessionDrops = data.drops.filter((drop) => drop.createdAt === createdAt);
    const firstDrop = sessionDrops[0];

    if (!firstDrop) return;

    const quantity = sessionDrops.reduce((total, drop) => total + drop.quantity, 0);

    setData((current) =>
      withActivity(
        current,
        { drops: current.drops.filter((drop) => drop.createdAt !== createdAt) },
        "removeu",
        "Loot",
        `${firstDrop.bossName} de ${firstDrop.player}`,
        {
          targetId: createdAt,
          metadata: [
            meta("Boss", firstDrop.bossName),
            meta("Personagem", firstDrop.player),
            meta("Sessao", createdAt),
            meta("Itens removidos", sessionDrops.length),
            meta("Quantidade total", quantity),
            meta("Hunts", "preservadas"),
          ],
        },
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
        {
          targetId: hunt.id,
          metadata: [
            meta("Personagem", character),
            meta("Data", input.date),
            meta("Tempo", hunt.duration),
            meta("Balance", hunt.balance),
            meta("XP/h", hunt.experienceHour),
            meta("Raw XP/h", hunt.rawExperienceHour),
            meta("Prints", hunt.images.length),
            meta("Tags", hunt.tags),
          ],
        },
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
        {
          targetId: hunt.id,
          metadata: [
            meta("Usuario", hunt.userName),
            meta("Personagem", hunt.character),
            meta("Data", hunt.date),
            meta("Balance", hunt.balance),
            meta("Tempo", hunt.duration),
          ],
        },
      ),
    );
  }

  function updateHunt(id: string, patch: HuntPatch) {
    const existing = data.hunts.find((entry) => entry.id === id);

    if (!existing || !canManageHunt(existing)) return;

    setData((current) => {
      let updatedTitle = existing.title;
      let updatedCharacter = existing.character;
      let updatedDate = existing.date;
      let updatedBalance = existing.balance;
      let updatedDuration = existing.duration;
      let updatedImages = existing.images.length;

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
        updatedCharacter = updated.character;
        updatedDate = updated.date;
        updatedBalance = updated.balance;
        updatedDuration = updated.duration;
        updatedImages = updated.images.length;

        return updated;
      });

      return withActivity(current, { hunts }, "editou", "Hunt", updatedTitle, {
        targetId: existing.id,
        metadata: [
          meta("Usuario", existing.userName),
          meta("Personagem", updatedCharacter),
          meta("Data", updatedDate),
          meta("Balance", updatedBalance),
          meta("Tempo", updatedDuration),
          meta("Prints", updatedImages),
        ],
        changes: compactChanges([
          change("Titulo", existing.title, patch.title ?? existing.title),
          change("Personagem", existing.character, patch.character ?? existing.character),
          change("Data", existing.date, patch.date ?? existing.date),
          change("Notas", existing.notes, patch.notes ?? existing.notes),
          change("Tags", existing.tags, patch.tags ?? existing.tags),
          patch.rawText !== undefined ? change("Hunting Analyser", "mantido", "atualizado") : null,
          patch.images !== undefined ? change("Prints", existing.images.length, patch.images.length) : null,
        ]),
      });
    });
  }

  function addUser(input: UserInput) {
    if (!isAdmin || !input.username.trim() || !input.password.trim()) return false;

    const username = input.username.trim();
    const alreadyExists = data.users.some((user) => user.username.toLowerCase() === username.toLowerCase());

    if (alreadyExists) return false;

    setData((current) => {
      const newUser = {
        id: makeId("user"),
        username,
        password: input.password,
        role: input.role,
      };

      return withActivity(
        current,
        { users: [...current.users, newUser] },
        "criou",
        "Usuario",
        username,
        {
          targetId: newUser.id,
          metadata: [meta("Permissao", input.role === "admin" ? "Admin" : "Usuario"), meta("Senha", "definida")],
        },
      );
    });

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
        {
          targetId: user.id,
          metadata: [meta("Usuario", user.username)],
          changes: compactChanges([
            cleanPatch.role ? change("Permissao", user.role, cleanPatch.role) : null,
            cleanPatch.password ? change("Senha", "mantida", "alterada") : null,
          ]),
        },
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
        {
          targetId: user.id,
          metadata: [meta("Permissao", user.role === "admin" ? "Admin" : "Usuario")],
        },
      );
    });
  }

  return {
    data,
    hasLoaded,
    currentUser,
    isAdmin,
    stats,
    refreshData,
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
    removeLootSession,
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
