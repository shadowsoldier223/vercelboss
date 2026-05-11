export type LootBoss = {
  key: string;
  label: string;
  mode: "duo" | "solo";
  drops: LootDefinition[];
};

export type LootDefinition = {
  id: string;
  item: string;
  category: string;
  aliases?: string[];
};

export type ParsedDrop = {
  drop: LootDefinition;
  quantity: number;
};

function drop(id: string, item: string, category: string, aliases: string[] = []): LootDefinition {
  return { id, item, category, aliases };
}

const commonDrops = {
  crystalCoins: drop("crystal-coins", "crystal coins", "Comum", ["crystal coin"]),
  silverToken: drop("silver-token", "silver token", "Comum", ["silver tokens"]),
  goldToken: drop("gold-token", "gold token", "Comum", ["gold tokens"]),
  nocturniaCoin: drop("nocturnia-coin", "nocturnia coin", "Comum", ["nocturnia coins"]),
};

const scrolls = {
  cloudFabric: drop("powerful-cloud-fabric-scroll", "Powerful Cloud Fabric Scroll", "Semi-raro", ["Powerful Cloud Fabric Scrolls"]),
  electrify: drop("powerful-electrify-scroll", "Powerful Electrify Scroll", "Semi-raro", ["Powerful Electrify Scrolls"]),
  extendedPromotion: drop("extended-promotion-scroll", "Extended Promotion Scroll", "Semi-raro", ["Extended Promotion Scrolls"]),
  advancedPromotion: drop("advanced-promotion-scroll", "Advanced Promotion Scroll", "Semi-raro", ["Advanced Promotion Scrolls"]),
  rouletteCoin: drop("roulette-coin", "Roulette Coin", "Semi-raro", ["Roulette Coins"]),
};

const rareShared = [
  drop("03-birthday-cupcake", "03's birthday cupcake", "Raro", ["03s birthday cupcake", "03 birthday cupcake"]),
  drop("03-birthday-cake", "03's birthday cake", "Raro", ["03s birthday cake", "03 birthday cake"]),
  drop("boosted-exercise-present", "Boosted Exercise Present", "Raro", ["Boosted Exercise Presents"]),
];

const nocturniaVeryRare = [
  drop("merciless-backpack", "Merciless Backpack", "Muito raro", ["Merciless Backpacks"]),
  drop("eclipse-catalyst", "Eclipse Catalyst", "Muito raro", ["Eclypse Catalyst", "Eclypse Catalysts"]),
  drop("unlit-crescent-crystal", "Unlit Crescent Crystal", "Muito raro", ["Unlit Crescent Crystals"]),
];

export const lootBosses: LootBoss[] = [
  {
    key: "necrolune",
    label: "Necrolune",
    mode: "duo",
    drops: [
      commonDrops.crystalCoins,
      commonDrops.silverToken,
      commonDrops.goldToken,
      commonDrops.nocturniaCoin,
      drop("mystic-bag", "mystic bag", "Semi-raro", ["mystic bags"]),
      drop("mini-obelisk", "mini obelisk", "Semi-raro", ["mini obelisks"]),
      drop("serene-backpack", "serene backpack", "Raro", ["serene backpacks"]),
      drop("plushie-of-necrolune", "plushie of necrolune", "Raro", ["plushie of a Necrolune", "plushie of Necrolune"]),
      rareShared[0],
      drop("eclipse-infusion-core", "Eclipse Infusion Core", "Muito raro", ["Eclipse Infusion Cores"]),
    ],
  },
  {
    key: "nocturnia-crescent",
    label: "Nocturnia - Crescent Moon",
    mode: "solo",
    drops: [
      commonDrops.crystalCoins,
      commonDrops.silverToken,
      commonDrops.nocturniaCoin,
      scrolls.cloudFabric,
      scrolls.electrify,
      scrolls.rouletteCoin,
      ...rareShared,
    ],
  },
  {
    key: "nocturnia-half",
    label: "Nocturnia - Half Moon",
    mode: "solo",
    drops: [
      commonDrops.crystalCoins,
      commonDrops.silverToken,
      commonDrops.goldToken,
      commonDrops.nocturniaCoin,
      scrolls.cloudFabric,
      scrolls.electrify,
      scrolls.extendedPromotion,
      scrolls.rouletteCoin,
      ...rareShared,
      ...nocturniaVeryRare,
    ],
  },
  {
    key: "nocturnia-full",
    label: "Nocturnia - Full Moon",
    mode: "solo",
    drops: [
      commonDrops.crystalCoins,
      commonDrops.silverToken,
      commonDrops.goldToken,
      commonDrops.nocturniaCoin,
      scrolls.cloudFabric,
      scrolls.electrify,
      scrolls.advancedPromotion,
      scrolls.rouletteCoin,
      ...rareShared,
      drop("stone-of-ascension", "Stone of Ascension", "Raro", ["Stones of Ascension"]),
      drop("soul-core-bag", "Soul Core Bag", "Raro", ["Soul Core Bags"]),
      ...nocturniaVeryRare,
      drop("23-nocturnia-rubini", "#23 Nocturnia Rubini", "Unico", ["23 Nocturnia Rubini", "Nocturnia Rubini"]),
    ],
  },
];

export function getLootBoss(key: string) {
  return lootBosses.find((boss) => boss.key === key) ?? lootBosses[0];
}

function normalizeLootText(value: string) {
  return value
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/\b(a|an)\b/g, " ")
    .replace(/[.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDropAliases(lootDrop: LootDefinition) {
  const aliases = [lootDrop.item, ...(lootDrop.aliases ?? [])];

  if (lootDrop.item.endsWith("s")) {
    aliases.push(lootDrop.item.slice(0, -1));
  } else {
    aliases.push(`${lootDrop.item}s`);
  }

  return aliases;
}

function getKnownDropByItem(itemName: string, drops: LootDefinition[]) {
  const normalizedItem = normalizeLootText(itemName);

  return drops.find((lootDrop) =>
    getDropAliases(lootDrop).some((alias) => normalizeLootText(alias) === normalizedItem),
  ) ?? null;
}

function getKnownLootDropByItem(itemName: string) {
  for (const boss of lootBosses) {
    const knownDrop = getKnownDropByItem(itemName, boss.drops);
    if (knownDrop) return knownDrop;
  }

  return null;
}

function toGenericDrop(itemName: string): LootDefinition {
  const cleanedItem = itemName
    .replace(/^(a|an)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: normalizeLootText(cleanedItem) || "loot",
    item: cleanedItem,
    category: "Loot",
  };
}

export function parseLootPaste(text: string, bossKey: string): ParsedDrop[] {
  if (!text.trim()) return [];

  const boss = getLootBoss(bossKey);
  const marker = "available in your reward chest:";
  const lowerText = text.toLowerCase();
  const markerIndex = lowerText.indexOf(marker);
  const lootText = markerIndex >= 0
    ? text.slice(markerIndex + marker.length)
    : text.slice(text.lastIndexOf(":") + 1);
  const totals = new Map<string, ParsedDrop>();
  const parts = lootText
    .split(/,|\s+and\s+|\s+e\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const cleanedPart = part.replace(/[.]+$/g, "").trim();
    const match = cleanedPart.match(/^(\d+)\s+(.+)$/);
    const quantity = match ? Number.parseInt(match[1], 10) : 1;
    const itemName = (match ? match[2] : cleanedPart).replace(/^(a|an)\s+/i, "");
    const lootDrop = getKnownDropByItem(itemName, boss.drops) ??
      getKnownLootDropByItem(itemName) ??
      toGenericDrop(itemName);

    if (!Number.isInteger(quantity) || quantity <= 0) continue;

    totals.set(lootDrop.id, {
      drop: lootDrop,
      quantity: (totals.get(lootDrop.id)?.quantity ?? 0) + quantity,
    });
  }

  return Array.from(totals.values());
}
