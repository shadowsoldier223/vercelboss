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

export function formatRemainingTime(isoDate: string | null) {
  if (!isoDate) return "liberado";

  const totalMinutes = Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!totalMinutes) return "liberado";
  if (!hours) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}

export function isCooldownActive(isoDate: string | null) {
  return Boolean(isoDate && new Date(isoDate).getTime() > Date.now());
}
