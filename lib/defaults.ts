import type { AppData, AppUser, Duo } from "./types";
import { lootBosses } from "./loot";

export const storageKey = "closedboss-state";
export const sessionKey = "closedboss-session";
export const previousStorageKey = "closeboss-state";
export const oldStorageKey = "tibia-feats";
export const duoCooldownMs = 20 * 60 * 60 * 1000;

/** Data de hoje (YYYY-MM-DD) no fuso de Sao Paulo, o mesmo usado em formatDate. */
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const starterDuos: Duo[] = [
  { id: "duo-1", left: "Wanius Zack", right: "Magic Max", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-2", left: "Eligos", right: "Malvadinho", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-3", left: "Durg Tyre", right: "Dente", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-4", left: "Billy Jhin", right: "?", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-5", left: "Brezzley", right: "Hunting", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-6", left: "Dente", right: "Mr ice", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-7", left: "Sodreh Indignado", right: "Ze Elite", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-8", left: "Jonas Rushful", right: "Hekate", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-9", left: "Doutor", right: "Nino Rox", status: null, markedAt: null, cooldownUntil: null },
  { id: "duo-10", left: "Larvae", right: "Dantas Ishigo", status: null, markedAt: null, cooldownUntil: null },
];

export const starterUsers: AppUser[] = [
  { id: "user-admin", username: "admin", password: "admin123", role: "admin" },
  { id: "user-player", username: "player", password: "player123", role: "user" },
];

export const defaultData: AppData = {
  feats: [],
  duos: starterDuos,
  drops: [],
  users: starterUsers,
  hunts: [],
  lootBosses,
  activityLogs: [],
};
