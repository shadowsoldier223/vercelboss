"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Crown, Gem, RefreshCw, Shield, Swords, Trash2, Trophy } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatNumber, formatSignedNumber, formatTime } from "@/lib/format";
import { cleanLootItemName, isBossBonusLoot, normalizeLootItemKey } from "@/lib/lootNames";
import { useAppData } from "@/lib/useAppData";

type WikiLootInfo = {
  itemName: string;
  rarity: string | null;
  rarityRange: string | null;
  chancePercent: number | null;
  kills: number | null;
};

type WikiBossLootResponse = {
  bosses?: Array<{
    bossKey: string;
    loot?: Array<{
      itemName: string;
      rarity?: string | null;
      rarityRange?: string | null;
      probability?: {
        chancePercent?: number | null;
        kills?: number | null;
      } | null;
    }>;
  }>;
};

const rarityRank: Record<string, number> = {
  "very rare": 1,
  rare: 2,
  "semi-rare": 3,
  uncommon: 4,
  common: 5,
  always: 6,
};

const rarityLabel: Record<string, string> = {
  "very rare": "muito raro",
  rare: "raro",
  "semi-rare": "semi-raro",
  uncommon: "incomum",
  common: "comum",
  always: "sempre",
};

function displayRarity(rarity: string | null, rarityRange: string | null) {
  if (!rarity) return "sem raridade";

  const label = rarityLabel[rarity.toLowerCase()] ?? rarity;

  return rarityRange ? `${label} / ${rarityRange}` : label;
}

export default function EstatisticasPage() {
  const { currentUser, data, hasLoaded, isAdmin, refreshData, removeLootSession, stats } = useAppData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lootInfo, setLootInfo] = useState<Record<string, WikiLootInfo>>({});
  const [lootInfoStatus, setLootInfoStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const statDrops = useMemo(() => data.drops.filter((drop) => !isBossBonusLoot(drop.item)), [data.drops]);
  const lootSessions = useMemo(() => {
    const sessions = new Map<
      string,
      {
        createdAt: string;
        bossName: string;
        player: string;
        itemCount: number;
        quantity: number;
      }
    >();

    for (const drop of statDrops) {
      const session = sessions.get(drop.createdAt) ?? {
        createdAt: drop.createdAt,
        bossName: drop.bossName,
        player: drop.player,
        itemCount: 0,
        quantity: 0,
      };

      session.itemCount += 1;
      session.quantity += drop.quantity;
      sessions.set(drop.createdAt, session);
    }

    return Array.from(sessions.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [statDrops]);
  const itemTotals = useMemo(() => {
    const totals = new Map<
      string,
      {
        item: string;
        quantity: number;
        category: string;
        rarity: string | null;
        rarityRange: string | null;
      }
    >();

    for (const drop of statDrops) {
      const normalizedItem = normalizeLootItemKey(drop.item);
      const lookup = lootInfo[`${drop.bossKey}:${normalizedItem}`];
      const itemName = lookup?.itemName ?? (cleanLootItemName(drop.item) || drop.item);
      const item = totals.get(normalizedItem) ?? {
        item: itemName,
        quantity: 0,
        category: drop.category,
        rarity: lookup?.rarity ?? null,
        rarityRange: lookup?.rarityRange ?? null,
      };

      item.item = lookup?.itemName ?? item.item;
      item.quantity += drop.quantity;
      item.rarity = lookup?.rarity ?? item.rarity;
      item.rarityRange = lookup?.rarityRange ?? item.rarityRange;
      totals.set(normalizedItem, item);
    }

    return Array.from(totals.values()).sort((a, b) => {
      const rarityA = rarityRank[a.rarity ?? ""] ?? 9;
      const rarityB = rarityRank[b.rarity ?? ""] ?? 9;

      if (rarityA !== rarityB) return rarityA - rarityB;
      return b.quantity - a.quantity;
    });
  }, [statDrops, lootInfo]);
  const characterLoot = useMemo(() => {
    const players = new Map<
      string,
      {
        player: string;
        sessions: Set<string>;
        bosses: Set<string>;
        quantity: number;
        items: Map<
          string,
          {
            item: string;
            bossName: string;
            bossKey: string;
            quantity: number;
            rarity: string | null;
            rarityRange: string | null;
            chancePercent: number | null;
            kills: number | null;
          }
        >;
      }
    >();

    for (const drop of statDrops) {
      const player = drop.player.trim() || "Sem personagem";
      const playerStats =
        players.get(player) ??
        {
          player,
          sessions: new Set<string>(),
          bosses: new Set<string>(),
          quantity: 0,
          items: new Map(),
        };
      const itemName = cleanLootItemName(drop.item) || drop.item;
      const itemKey = `${drop.bossKey}:${normalizeLootItemKey(drop.item)}`;
      const lookup = lootInfo[itemKey];
      const item =
        playerStats.items.get(itemKey) ??
        {
          item: lookup?.itemName ?? itemName,
          bossName: drop.bossName,
          bossKey: drop.bossKey,
          quantity: 0,
          rarity: lookup?.rarity ?? null,
          rarityRange: lookup?.rarityRange ?? null,
          chancePercent: lookup?.chancePercent ?? null,
          kills: lookup?.kills ?? null,
        };

      item.quantity += drop.quantity;
      item.item = lookup?.itemName ?? item.item;
      item.rarity = lookup?.rarity ?? item.rarity;
      item.rarityRange = lookup?.rarityRange ?? item.rarityRange;
      item.chancePercent = lookup?.chancePercent ?? item.chancePercent;
      item.kills = lookup?.kills ?? item.kills;
      playerStats.sessions.add(drop.createdAt);
      playerStats.bosses.add(drop.bossName);
      playerStats.quantity += drop.quantity;
      playerStats.items.set(itemKey, item);
      players.set(player, playerStats);
    }

    return Array.from(players.values())
      .map((player) => {
        const items = Array.from(player.items.values()).sort((a, b) => {
          const rarityA = rarityRank[a.rarity ?? ""] ?? 9;
          const rarityB = rarityRank[b.rarity ?? ""] ?? 9;

          if (rarityA !== rarityB) return rarityA - rarityB;
          if (a.chancePercent !== null && b.chancePercent !== null) return a.chancePercent - b.chancePercent;
          return b.quantity - a.quantity;
        });
        const notableItems = items.filter((item) => ["very rare", "rare", "semi-rare"].includes(item.rarity ?? ""));

        return {
          ...player,
          itemCount: items.length,
          items,
          notableItems,
        };
      })
      .sort((a, b) => b.sessions.size - a.sessions.size || b.quantity - a.quantity);
  }, [statDrops, lootInfo]);

  useEffect(() => {
    if (!currentUser || !data.drops.length) {
      setLootInfo({});
      setLootInfoStatus("idle");
      return;
    }

    let cancelled = false;

    async function loadLootInfo() {
      setLootInfoStatus("loading");

      try {
        const response = await fetch("/api/tibiawiki/boss-loot?all=1", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("wiki lookup failed");
        }

        const payload = (await response.json()) as WikiBossLootResponse;
        const nextInfo: Record<string, WikiLootInfo> = {};

        for (const boss of payload.bosses ?? []) {
          for (const item of boss.loot ?? []) {
            const key = `${boss.bossKey}:${normalizeLootItemKey(item.itemName)}`;

            nextInfo[key] = {
              itemName: item.itemName,
              rarity: item.rarity ?? null,
              rarityRange: item.rarityRange ?? null,
              chancePercent: item.probability?.chancePercent ?? null,
              kills: item.probability?.kills ?? null,
            };
          }
        }

        if (!cancelled) {
          setLootInfo(nextInfo);
          setLootInfoStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setLootInfo({});
          setLootInfoStatus("error");
        }
      }
    }

    void loadLootInfo();

    return () => {
      cancelled = true;
    };
  }, [currentUser, data.drops.length, data.lootBosses]);

  async function refreshNow() {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }

  if (!hasLoaded) {
    return (
      <section className="loginPrompt">
        <span className="eyebrow">Closed</span>
        <h1>Carregando acesso</h1>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Estatisticas</span>
        <h1>Entre para ver os dados</h1>
        <p>As informacoes do painel ficam disponiveis apenas depois do login.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="pageHeader statsHeader">
        <div>
          <span className="eyebrow">Resumo</span>
          <h1>Estatisticas</h1>
          <p>Totais por registro, item e personagem, usando os dados sincronizados do painel.</p>
        </div>
        <button type="button" className="headerActionButton" onClick={refreshNow} disabled={isRefreshing}>
          <RefreshCw size={17} />
          {isRefreshing ? "Atualizando" : "Atualizar"}
        </button>
      </section>

      <section className="statGrid">
        <StatCard icon={BarChart3} label="Registros" value={stats.totalFeats} />
        <StatCard icon={Crown} label="Bosses" value={stats.lootBosses} />
        <StatCard icon={Swords} label="Hunts salvas" value={stats.registeredHunts} />
        <StatCard icon={Trophy} label="Balance hunts" value={formatSignedNumber(stats.huntBalance)} />
      </section>

      <section className="statsColumns">
        <div className="panel">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Itens</span>
              <h2>Total por item</h2>
            </div>
            <Gem size={22} />
          </div>
          <div className="tableList">
            {itemTotals.map((entry) => (
              <div className="tableRow" key={entry.item}>
                <span>{entry.item}</span>
                <strong>{entry.quantity}x</strong>
                <em>{entry.rarity ? displayRarity(entry.rarity, entry.rarityRange) : entry.category}</em>
              </div>
            ))}
            {!itemTotals.length ? <p className="mutedText">Ainda nao tem drops salvos.</p> : null}
          </div>
        </div>

        <div className="panel characterLootPanel">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Personagens</span>
              <h2>Loot por personagem</h2>
            </div>
            <BarChart3 size={22} />
          </div>
          <p className="mutedText">
            {lootInfoStatus === "loading"
              ? "Classificando loots com TibiaWiki..."
              : lootInfoStatus === "error"
                ? "Nao foi possivel cruzar com o TibiaWiki agora. Mostrando apenas os loots salvos."
                : "Separado por char, boss, item e raridade do TibiaWiki."}
          </p>
          <div className="characterLootList">
            {characterLoot.map((entry) => (
              <article className="characterLootCard" key={entry.player}>
                <div className="characterLootHead">
                  <div>
                    <strong>{entry.player}</strong>
                    <span>{Array.from(entry.bosses).join(", ")}</span>
                  </div>
                  <div className="characterLootMetrics">
                    <span>
                      Sessoes
                      <strong>{entry.sessions.size}</strong>
                    </span>
                    <span>
                      Itens unicos
                      <strong>{entry.itemCount}</strong>
                    </span>
                    <span>
                      Raros
                      <strong>{entry.notableItems.length}</strong>
                    </span>
                  </div>
                </div>

                <div className="characterItemList">
                  {entry.items.slice(0, Math.max(8, entry.notableItems.length)).map((item) => (
                    <div className="characterItemRow" key={`${entry.player}-${item.bossKey}-${item.item}`}>
                      <div>
                        <strong>{item.item}</strong>
                        <span>{item.bossName}</span>
                      </div>
                      <span>{`${formatNumber(item.quantity)}x`}</span>
                      <em>
                        {displayRarity(item.rarity, item.rarityRange)}
                        {item.chancePercent !== null ? ` / ${item.chancePercent.toLocaleString("pt-BR")}%` : ""}
                      </em>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {!characterLoot.length ? <p className="mutedText">Ainda nao tem personagens com loot.</p> : null}
          </div>
        </div>
      </section>

      <section className="panel statsSessionsPanel">
        <div className="sectionTitle">
          <div>
            <span className="eyebrow">Loot</span>
            <h2>Sessoes contabilizadas na Stats</h2>
          </div>
          <Gem size={22} />
        </div>

        <div className="lootSessionList">
          {lootSessions.map((session) => (
            <article className="lootSessionRow" key={session.createdAt}>
              <div>
                <strong>{session.bossName}</strong>
                <span>{`${session.player} / ${formatDate(session.createdAt)} as ${formatTime(session.createdAt)}`}</span>
              </div>
              <span>
                Itens
                <strong>{session.itemCount}</strong>
              </span>
              <span>
                Quantidade
                <strong>{formatNumber(session.quantity)}</strong>
              </span>
              {isAdmin ? (
                <button type="button" className="iconButton" onClick={() => removeLootSession(session.createdAt)} title="Remover da Stats">
                  <Trash2 size={17} />
                </button>
              ) : null}
            </article>
          ))}
          {!lootSessions.length ? <p className="mutedText">Nenhum loot salvo para contabilizar.</p> : null}
        </div>
      </section>
    </>
  );
}
