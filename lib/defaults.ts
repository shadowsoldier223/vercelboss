import type { AppData, Duo, Feat } from "./types";

export const storageKey = "closedboss-state";
export const previousStorageKey = "closeboss-state";
export const oldStorageKey = "tibia-feats";
export const duoCooldownMs = 20 * 60 * 60 * 1000;

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export const starterFeats: Feat[] = [
  {
    id: "sample-1",
    type: "Boss",
    title: "Necrolune",
    character: "Eligos",
    world: "Rubinot",
    date: today(),
    place: "Reward chest",
    loot: "crystal coins, nocturnia coin, silver token",
    notes: "Exemplo baseado no fluxo do bot: boss, dupla, loot e cooldown.",
    difficulty: 4,
  },
  {
    id: "sample-2",
    type: "Hunt",
    title: "Soulwar duo",
    character: "Meu Paladin",
    world: "Gentebra",
    date: today(),
    place: "Ebb and Flow",
    loot: "Profit alto",
    notes: "Use registros para hunts, quests e metas que nao precisam de parser.",
    difficulty: 3,
  },
];

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

export const defaultData: AppData = {
  feats: starterFeats,
  duos: starterDuos,
  drops: [],
};

export function createEmptyFeat(type: Feat["type"] = "Boss"): Omit<Feat, "id"> {
  return {
    type,
    title: "",
    character: "",
    world: "",
    date: today(),
    place: "",
    loot: "",
    notes: "",
    difficulty: 3,
  };
}
