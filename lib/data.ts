import { defaultData, today } from "./defaults";
import { parseHuntingAnalyser } from "./hunts";
import type { AppData, HuntImage, HuntSession } from "./types";

export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHunt(hunt: Partial<HuntSession>): HuntSession {
  const rawText = hunt.rawText ?? "";
  const parsed = rawText.trim() ? parseHuntingAnalyser(rawText) : null;

  return {
    id: hunt.id ?? makeId("hunt"),
    userId: hunt.userId ?? "",
    userName: hunt.userName ?? "admin",
    title: hunt.title ?? "Hunt registrada",
    character: hunt.character ?? "",
    date: hunt.date ?? today(),
    duration: parsed?.duration ?? hunt.duration ?? "",
    loot: parsed?.loot ?? hunt.loot ?? 0,
    supplies: parsed?.supplies ?? hunt.supplies ?? 0,
    balance: parsed?.balance ?? hunt.balance ?? 0,
    damage: parsed?.damage ?? hunt.damage ?? 0,
    damageHour: parsed?.damageHour ?? hunt.damageHour ?? 0,
    healing: parsed?.healing ?? hunt.healing ?? 0,
    healingHour: parsed?.healingHour ?? hunt.healingHour ?? 0,
    experience: parsed?.experience ?? hunt.experience ?? 0,
    experienceHour: parsed?.experienceHour ?? hunt.experienceHour ?? 0,
    rawExperience: parsed?.rawExperience ?? hunt.rawExperience ?? 0,
    rawExperienceHour: parsed?.rawExperienceHour ?? hunt.rawExperienceHour ?? 0,
    rawText,
    notes: hunt.notes ?? "",
    images: normalizeHuntImages(hunt.images),
    tags: normalizeTags(hunt.tags),
    createdAt: hunt.createdAt ?? new Date().toISOString(),
  };
}

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 28)),
    ),
  ).slice(0, 8);
}

function normalizeHuntImages(images: unknown): HuntImage[] {
  if (!Array.isArray(images)) return [];

  return images
    .filter((image): image is Partial<HuntImage> => Boolean(image) && typeof image === "object")
    .filter((image) => typeof image.src === "string" && Boolean(image.src))
    .map((image) => ({
      id: image.id ?? makeId("hunt-image"),
      name: image.name ?? "Imagem da hunt",
      src: image.src ?? "",
      pathname: image.pathname,
    }))
    .filter((image) => image.src.startsWith("data:image/") || image.src.startsWith("/api/hunt-images/") || image.src.startsWith("https://"));
}

export function normalizeAppData(data: Partial<AppData> | null): AppData {
  return {
    feats: Array.isArray(data?.feats) ? data.feats : defaultData.feats,
    duos: Array.isArray(data?.duos) ? data.duos : defaultData.duos,
    drops: Array.isArray(data?.drops) ? data.drops : [],
    users: Array.isArray(data?.users) && data.users.length ? data.users : defaultData.users,
    hunts: Array.isArray(data?.hunts) ? data.hunts.map(normalizeHunt) : [],
    lootBosses: Array.isArray(data?.lootBosses) ? data.lootBosses : defaultData.lootBosses,
    activityLogs: Array.isArray(data?.activityLogs) ? data.activityLogs.slice(0, 250) : [],
  };
}

export function hasCustomLocalData(data: AppData) {
  return JSON.stringify(data) !== JSON.stringify(defaultData);
}
