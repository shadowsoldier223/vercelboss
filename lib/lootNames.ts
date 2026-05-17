export function cleanLootItemName(value: string) {
  return value
    .replace(/\s*\(\s*boss\s+bonus\s*\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBossBonusLoot(value: string) {
  return /\(\s*boss\s+bonus\s*\)/i.test(value);
}

export function normalizeLootItemKey(value: string) {
  return cleanLootItemName(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
      if (word.endsWith("ss")) return word;
      if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
      return word;
    })
    .join(" ");
}
