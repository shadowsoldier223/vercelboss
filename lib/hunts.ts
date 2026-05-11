export type ParsedHuntAnalyser = {
  duration: string;
  loot: number;
  supplies: number;
  balance: number;
  damage: number;
  damageHour: number;
  healing: number;
  healingHour: number;
  experience: number;
  experienceHour: number;
};

const emptyParsedHunt: ParsedHuntAnalyser = {
  duration: "",
  loot: 0,
  supplies: 0,
  balance: 0,
  damage: 0,
  damageHour: 0,
  healing: 0,
  healingHour: 0,
  experience: 0,
  experienceHour: 0,
};

function parseAmount(value: string | undefined) {
  if (!value) return 0;

  const normalized = value.replace(/[^\d-]/g, "");
  return normalized ? Number(normalized) : 0;
}

function readNumber(rawText: string, labels: string[]) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = rawText.match(new RegExp(`^\\s*${escaped}\\s*:?\\s*([-+]?\\d[\\d.,]*)`, "im"));

    if (match?.[1]) {
      return parseAmount(match[1]);
    }
  }

  return 0;
}

function readDuration(rawText: string) {
  const match = rawText.match(/^\s*Session\s*:\s*(.+)$/im) ?? rawText.match(/^\s*Tempo\s*:\s*(.+)$/im);
  return match?.[1]?.trim() ?? "";
}

export function parseHuntingAnalyser(rawText: string): ParsedHuntAnalyser {
  if (!rawText.trim()) {
    return emptyParsedHunt;
  }

  return {
    duration: readDuration(rawText),
    loot: readNumber(rawText, ["Loot"]),
    supplies: readNumber(rawText, ["Supplies", "Gastos"]),
    balance: readNumber(rawText, ["Balance", "Profit", "Saldo"]),
    damage: readNumber(rawText, ["Damage"]),
    damageHour: readNumber(rawText, ["Damage/h", "Damage per hour"]),
    healing: readNumber(rawText, ["Healing"]),
    healingHour: readNumber(rawText, ["Healing/h", "Healing per hour"]),
    experience: readNumber(rawText, ["Raw XP Gain", "XP Gain", "Experience"]),
    experienceHour: readNumber(rawText, ["XP/h", "Experience/h"]),
  };
}
