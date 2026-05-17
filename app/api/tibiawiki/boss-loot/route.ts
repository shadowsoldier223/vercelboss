import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeLootItemKey } from "@/lib/lootNames";
import { readAppData, sessionCookieName, verifySessionToken } from "@/lib/serverData";
import type { LootBoss } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const userAgent = "ClosedBoss/1.0 (TibiaWiki loot lookup)";

type TibiaWikiLootEntry = {
  amount?: string;
  itemName?: string;
  rarity?: string;
};

type TibiaWikiCreature = {
  name?: string;
  actualname?: string;
  hp?: string;
  exp?: string;
  cooldown?: string;
  isboss?: string;
  loot?: TibiaWikiLootEntry[];
};

type LootStatistic = {
  itemName: string;
  times: number;
  total?: number;
  amount?: string;
  chancePercent: number;
};

type LootStatistics = {
  kills: number;
  pageTitle: string;
  sourceUrl: string;
  items: LootStatistic[];
};

type FandomSearchResponse = [string, string[], string[], string[]];

function keyify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wikiTitle(value: string) {
  return value.trim().replace(/\s+/g, "_");
}

function rarityRange(rarity: string | null) {
  const normalized = rarity?.toLowerCase() ?? "";

  if (normalized === "always") return "100%";
  if (normalized === "common") return "100% a 25%";
  if (normalized === "uncommon") return "25% a 5%";
  if (normalized === "semi-rare") return "5% a 1%";
  if (normalized === "rare") return "1% a 0.5%";
  if (normalized === "very rare") return "< 0.5%";

  return null;
}

function inferRarityFromChance(chancePercent: number | null) {
  if (chancePercent === null) return null;
  if (chancePercent >= 100) return "always";
  if (chancePercent >= 25) return "common";
  if (chancePercent >= 5) return "uncommon";
  if (chancePercent >= 1) return "semi-rare";
  if (chancePercent >= 0.5) return "rare";

  return "very rare";
}

function inferRarityFromMissingSample(kills: number | null | undefined) {
  if (!kills) return null;

  const upperBoundPercent = 100 / kills;

  return upperBoundPercent < 0.5 ? "very rare" : null;
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined;

  const parsed = Number(value.replace(/\./g, "").replace(/,/g, ""));

  return Number.isFinite(parsed) ? parsed : undefined;
}

async function requireUser() {
  const cookieStore = await cookies();
  const userId = verifySessionToken(cookieStore.get(sessionCookieName)?.value);
  const state = await readAppData();
  const user = userId ? state.data.users.find((entry) => entry.id === userId) : null;

  return user ? { state, user } : null;
}

async function fetchCreature(title: string) {
  const response = await fetch(`https://tibiawiki.dev/api/creatures/${encodeURIComponent(title)}`, {
    headers: { "User-Agent": userAgent },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) return null;

  const creature = (await response.json()) as TibiaWikiCreature;
  const hasCreatureData = Boolean(
    creature.name ||
      creature.actualname ||
      creature.hp ||
      creature.exp ||
      creature.cooldown ||
      creature.isboss ||
      (Array.isArray(creature.loot) && creature.loot.length),
  );

  return hasCreatureData ? creature : null;
}

async function searchWikiTitle(query: string) {
  const params = new URLSearchParams({
    action: "opensearch",
    search: query,
    limit: "5",
    namespace: "0",
    format: "json",
  });
  const response = await fetch(`https://tibia.fandom.com/api.php?${params.toString()}`, {
    headers: { "User-Agent": userAgent },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as FandomSearchResponse;

  return data[1]?.[0] ?? null;
}

async function resolveCreature(name: string) {
  const exact = await fetchCreature(name);

  if (exact) return { creature: exact, pageTitle: exact.name ?? name };

  const searchTitle = await searchWikiTitle(name);

  if (!searchTitle) return { creature: null, pageTitle: name };

  const searched = await fetchCreature(searchTitle);

  return { creature: searched, pageTitle: searched?.name ?? searchTitle };
}

function parseLootStatisticsWikitext(wikitext: string, pageTitle: string): LootStatistics | null {
  const firstTemplateStart = wikitext.search(/\{\{Loot/i);
  const firstTemplateEnd = firstTemplateStart >= 0 ? wikitext.indexOf("}}", firstTemplateStart) : -1;
  const currentTemplate =
    firstTemplateStart >= 0 && firstTemplateEnd > firstTemplateStart
      ? wikitext.slice(firstTemplateStart, firstTemplateEnd)
      : wikitext;
  const killsMatch = currentTemplate.match(/\|\s*kills\s*=\s*([\d.,]+)/i);
  const kills = parseNumber(killsMatch?.[1]);

  if (!kills) return null;

  const items = currentTemplate
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line): LootStatistic | null => {
      const match = line.match(/^\|\s*(.+?),\s*times\s*:\s*([\d.]+)(?:,\s*amount\s*:\s*([^,|]+))?(?:,\s*total\s*:\s*([\d.]+))?/i);

      if (!match) return null;

      const itemName = match[1].trim();
      const times = parseNumber(match[2]);

      if (!times || !itemName) return null;

      return {
        itemName,
        times,
        amount: match[3]?.trim(),
        total: parseNumber(match[4]),
        chancePercent: Number(((times / kills) * 100).toFixed(4)),
      };
    })
    .filter((entry): entry is LootStatistic => Boolean(entry));

  return {
    kills,
    pageTitle: `Loot_Statistics:${pageTitle}`,
    sourceUrl: `https://tibia.fandom.com/wiki/${encodeURIComponent(`Loot_Statistics:${wikiTitle(pageTitle)}`)}`,
    items,
  };
}

async function fetchLootStatistics(pageTitle: string) {
  const params = new URLSearchParams({
    action: "parse",
    page: `Loot_Statistics:${wikiTitle(pageTitle)}`,
    format: "json",
    prop: "wikitext",
    redirects: "1",
  });
  const response = await fetch(`https://tibia.fandom.com/api.php?${params.toString()}`, {
    headers: { "User-Agent": userAgent },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    parse?: { wikitext?: { "*": string } };
    error?: { code?: string; info?: string };
  };
  const wikitext = payload.parse?.wikitext?.["*"];

  if (!wikitext || payload.error) return null;

  return parseLootStatisticsWikitext(wikitext, pageTitle);
}

function findLocalBoss(bosses: LootBoss[], bossKey: string | null, name: string | null) {
  if (bossKey) {
    const byKey = bosses.find((boss) => boss.key === bossKey || keyify(boss.label) === keyify(bossKey));

    if (byKey) return byKey;
  }

  if (name) {
    const normalizedName = keyify(name);

    return bosses.find((boss) => keyify(boss.label) === normalizedName) ?? null;
  }

  return null;
}

async function buildBossLookup(boss: LootBoss) {
  const { creature, pageTitle } = await resolveCreature(boss.label);

  if (!creature) {
    return {
      bossKey: boss.key,
      localName: boss.label,
      found: false,
      error: "Boss nao encontrado no TibiaWiki.",
      loot: [],
    };
  }

  const title = creature.name ?? pageTitle;
  const statistics = await fetchLootStatistics(title);
  const statsByItem = new Map((statistics?.items ?? []).map((item) => [normalizeLootItemKey(item.itemName), item]));
  const lootFromCreature = Array.isArray(creature.loot) ? creature.loot : [];
  const mergedLoot = lootFromCreature.map((entry) => {
    const itemName = entry.itemName ?? "";
    const itemStats = statsByItem.get(normalizeLootItemKey(itemName));
    const chancePercent = itemStats?.chancePercent ?? null;
    const missingSampleRarity = itemStats ? null : inferRarityFromMissingSample(statistics?.kills);
    const rarity = entry.rarity ?? inferRarityFromChance(chancePercent) ?? missingSampleRarity;

    return {
      itemName,
      amount: entry.amount ?? itemStats?.amount ?? null,
      rarity,
      rarityRange: rarityRange(rarity),
      probability: itemStats
        ? {
            kills: statistics?.kills ?? 0,
            droppedInKills: itemStats.times,
            chancePercent,
            totalAmount: itemStats.total ?? null,
            source: "Loot Statistics",
          }
        : missingSampleRarity
          ? {
              kills: statistics?.kills ?? 0,
              droppedInKills: 0,
              chancePercent: null,
              totalAmount: null,
              source: "Loot Statistics sem ocorrencia",
            }
        : null,
    };
  });
  const knownItems = new Set(mergedLoot.map((entry) => normalizeLootItemKey(entry.itemName)));
  const statisticsOnlyLoot = (statistics?.items ?? [])
    .filter((entry) => !knownItems.has(normalizeLootItemKey(entry.itemName)))
    .map((entry) => {
      const rarity = inferRarityFromChance(entry.chancePercent);

      return {
        itemName: entry.itemName,
        amount: entry.amount ?? null,
        rarity,
        rarityRange: rarityRange(rarity),
        probability: {
          kills: statistics?.kills ?? 0,
          droppedInKills: entry.times,
          chancePercent: entry.chancePercent,
          totalAmount: entry.total ?? null,
          source: "Loot Statistics",
        },
      };
    });

  return {
    bossKey: boss.key,
    localName: boss.label,
    found: true,
    wikiName: title,
    actualName: creature.actualname ?? null,
    hp: creature.hp ?? null,
    exp: creature.exp ?? null,
    cooldown: creature.cooldown ?? null,
    isBoss: creature.isboss ?? null,
    statistics: statistics
      ? {
          available: true,
          kills: statistics.kills,
          pageTitle: statistics.pageTitle,
          sourceUrl: statistics.sourceUrl,
        }
      : {
          available: false,
          kills: null,
          pageTitle: `Loot_Statistics:${title}`,
          sourceUrl: `https://tibia.fandom.com/wiki/${encodeURIComponent(`Loot_Statistics:${wikiTitle(title)}`)}`,
        },
    loot: [...mergedLoot, ...statisticsOnlyLoot].filter((entry) => entry.itemName),
    sources: {
      creatureApi: `https://tibiawiki.dev/api/creatures/${encodeURIComponent(title)}`,
      creaturePage: `https://tibia.fandom.com/wiki/${encodeURIComponent(wikiTitle(title))}`,
      rarityReference: "https://tibia.fandom.com/wiki/Rareness",
    },
  };
}

export async function GET(request: Request) {
  const session = await requireUser();

  if (!session) {
    return NextResponse.json({ ok: false, error: "Login necessario." }, { status: 401 });
  }

  const url = new URL(request.url);
  const bossKey = url.searchParams.get("bossKey") ?? url.searchParams.get("key");
  const name = url.searchParams.get("name") ?? url.searchParams.get("q");
  const shouldFetchAll = url.searchParams.get("all") === "1";
  const bosses = session.state.data.lootBosses;
  const selectedBosses = shouldFetchAll
    ? bosses
    : [findLocalBoss(bosses, bossKey, name)].filter((boss): boss is LootBoss => Boolean(boss));

  if (!selectedBosses.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Boss nao encontrado entre os bosses cadastrados no ClosedBoss.",
        availableBosses: bosses.map((boss) => ({ key: boss.key, label: boss.label })),
      },
      { status: 404 },
    );
  }

  const limit = Math.min(selectedBosses.length, 25);
  const results = await Promise.all(selectedBosses.slice(0, limit).map(buildBossLookup));

  return NextResponse.json(
    {
      ok: true,
      count: results.length,
      note: "Probabilidades sao calculadas a partir das paginas comunitarias de Loot Statistics quando elas existem. Raridade vem do TibiaWiki ou e inferida pela porcentagem observada.",
      bosses: results,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
