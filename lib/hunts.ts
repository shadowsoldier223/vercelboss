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
  rawExperience: number;
  rawExperienceHour: number;
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
  rawExperience: 0,
  rawExperienceHour: 0,
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

function parseDurationText(duration: string) {
  const cleanDuration = duration.trim().toLowerCase();
  const timeMatch = cleanDuration.match(/(\d{1,3}):(\d{2})(?::(\d{2}))?/);

  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = Number(timeMatch[3] ?? 0);
    return Math.max(1, Math.round(hours * 60 + minutes + seconds / 60));
  }

  const hoursMatch = cleanDuration.match(/(\d+(?:[.,]\d+)?)\s*h/);
  const minutesMatch = cleanDuration.match(/(\d+)\s*m/);
  const hours = hoursMatch ? Number(hoursMatch[1].replace(",", ".")) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const totalMinutes = Math.round(hours * 60 + minutes);

  return totalMinutes > 0 ? totalMinutes : 0;
}

function readDurationFromSessionData(rawText: string) {
  const match = rawText.match(
    /Session data:\s*From\s*(\d{4}-\d{2}-\d{2}),\s*(\d{2}:\d{2}:\d{2})\s*to\s*(\d{4}-\d{2}-\d{2}),\s*(\d{2}:\d{2}:\d{2})/i,
  );

  if (!match) return 0;

  const start = new Date(`${match[1]}T${match[2]}`);
  const end = new Date(`${match[3]}T${match[4]}`);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);

  return minutes > 0 ? minutes : 0;
}

function formatDuration(totalMinutes: number) {
  if (!totalMinutes) return "";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}h`;
}

function calculatePerHour(total: number, totalMinutes: number, fallback: number) {
  if (!total || !totalMinutes) return fallback;

  return Math.round(total / (totalMinutes / 60));
}

export function parseHuntingAnalyser(rawText: string): ParsedHuntAnalyser {
  if (!rawText.trim()) {
    return emptyParsedHunt;
  }

  const duration = readDuration(rawText);
  const durationMinutes = parseDurationText(duration) || readDurationFromSessionData(rawText);
  const experience = readNumber(rawText, ["XP Gain", "Experience"]);
  const rawExperience = readNumber(rawText, ["Raw XP Gain"]);
  const parsedExperienceHour = readNumber(rawText, ["XP/h", "Experience/h"]);
  const parsedRawExperienceHour = readNumber(rawText, ["Raw XP/h"]);

  return {
    duration: formatDuration(durationMinutes) || duration,
    loot: readNumber(rawText, ["Loot"]),
    supplies: readNumber(rawText, ["Supplies", "Gastos"]),
    balance: readNumber(rawText, ["Balance", "Profit", "Saldo"]),
    damage: readNumber(rawText, ["Damage"]),
    damageHour: readNumber(rawText, ["Damage/h", "Damage per hour"]),
    healing: readNumber(rawText, ["Healing"]),
    healingHour: readNumber(rawText, ["Healing/h", "Healing per hour"]),
    experience,
    experienceHour: calculatePerHour(experience, durationMinutes, parsedExperienceHour),
    rawExperience,
    rawExperienceHour: calculatePerHour(rawExperience, durationMinutes, parsedRawExperienceHour),
  };
}
