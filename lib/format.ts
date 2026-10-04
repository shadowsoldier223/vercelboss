export function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`));
}

export function formatTime(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(new Date(isoDate));
}

export function formatRemainingTime(isoDate: string | null, now: number = Date.now()) {
  if (!isoDate) return "liberado";

  const totalMinutes = Math.max(0, Math.ceil((new Date(isoDate).getTime() - now) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!totalMinutes) return "liberado";
  if (!hours) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}

/** "hoje as 14:30", "amanha as 08:10" ou "05/10/2026 as 08:10" (fuso de Sao Paulo). */
export function formatReleaseAt(isoDate: string, now: number = Date.now()) {
  const day = formatDate(isoDate);
  const time = formatTime(isoDate);

  if (day === formatDate(new Date(now).toISOString())) return `hoje as ${time}`;
  if (day === formatDate(new Date(now + 24 * 60 * 60 * 1000).toISOString())) return `amanha as ${time}`;

  return `${day} as ${time}`;
}

export function isCooldownActive(isoDate: string | null, now: number = Date.now()) {
  return Boolean(isoDate && new Date(isoDate).getTime() > now);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatSignedNumber(value: number) {
  const formatted = formatNumber(Math.abs(value));

  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}
