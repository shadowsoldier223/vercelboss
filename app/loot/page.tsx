"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gem, History, Layers, Search, Shield, Sparkles, Users } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import { buildLootSessions, buildPlayerLoot, categoryOrder, filterLootSessions } from "@/lib/lootView";
import { useAppData } from "@/lib/useAppData";

type View = "jogadores" | "historico";

const HISTORY_PAGE_SIZE = 20;

export default function LootPage() {
  const { currentUser, data, hasLoaded } = useAppData();
  const [view, setView] = useState<View>("jogadores");
  const [query, setQuery] = useState("");
  const [bossKey, setBossKey] = useState("");
  const [visibleSessions, setVisibleSessions] = useState(HISTORY_PAGE_SIZE);

  const sessions = useMemo(() => buildLootSessions(data.drops), [data.drops]);
  const bossOptions = useMemo(() => {
    const bosses = new Map<string, string>();

    for (const session of sessions) bosses.set(session.bossKey, session.bossName);

    return Array.from(bosses, ([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [sessions]);
  const filtered = useMemo(() => filterLootSessions(sessions, { bossKey, query }), [sessions, bossKey, query]);
  const players = useMemo(() => buildPlayerLoot(filtered), [filtered]);

  const totals = useMemo(() => {
    let quantity = 0;
    let rare = 0;

    for (const session of sessions) {
      for (const item of session.items) {
        quantity += item.quantity;
        if (categoryOrder(item.category) <= 2) rare += item.quantity;
      }
    }

    return { quantity, rare, players: new Set(sessions.map((session) => session.player.toLowerCase())).size };
  }, [sessions]);

  const hasFilters = Boolean(query.trim() || bossKey);

  function changeBoss(value: string) {
    setBossKey(value);
    setVisibleSessions(HISTORY_PAGE_SIZE);
  }

  function changeQuery(value: string) {
    setQuery(value);
    setVisibleSessions(HISTORY_PAGE_SIZE);
  }

  if (!hasLoaded) {
    return (
      <section className="loginPrompt">
        <span className="eyebrow">Loot</span>
        <h1>Carregando loots</h1>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Loot</span>
        <h1>Entre para consultar os loots</h1>
        <p>Os drops registrados ao concluir bosses solo ou duo ficam reunidos aqui.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <section className="lootOverview">
      <div className="sectionTitle">
        <div>
          <span className="eyebrow">Somente leitura</span>
          <h1>Registro de loot</h1>
        </div>
        <Gem size={24} />
      </div>

      <p className="mutedText">
        Os drops entram aqui automaticamente quando um boss duo e concluido na aba Duos ou um boss solo e registrado na aba Bosses.
      </p>

      <div className="statGrid">
        <StatCard icon={Layers} label="Registros" value={formatNumber(sessions.length)} />
        <StatCard icon={Gem} label="Itens dropados" value={formatNumber(totals.quantity)} />
        <StatCard icon={Sparkles} label="Raros ou melhores" value={formatNumber(totals.rare)} />
        <StatCard icon={Users} label="Jogadores / duplas" value={formatNumber(totals.players)} />
      </div>

      <div className="lootToolbar">
        <div className="searchBox">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Buscar jogador, boss ou item"
            aria-label="Buscar loot"
          />
        </div>
        <select value={bossKey} onChange={(event) => changeBoss(event.target.value)} aria-label="Filtrar por boss">
          <option value="">Todos os bosses</option>
          {bossOptions.map((boss) => (
            <option value={boss.key} key={boss.key}>
              {boss.label}
            </option>
          ))}
        </select>
        <div className="adminTabs" role="tablist" aria-label="Modo de visualizacao">
          <button type="button" role="tab" aria-selected={view === "jogadores"} className={view === "jogadores" ? "active" : ""} onClick={() => setView("jogadores")}>
            Por jogador
          </button>
          <button type="button" role="tab" aria-selected={view === "historico"} className={view === "historico" ? "active" : ""} onClick={() => setView("historico")}>
            Historico
          </button>
        </div>
      </div>

      {view === "jogadores" ? (
        <div className="characterLootList">
          {players.map((entry) => (
            <article className="characterLootCard" key={entry.key}>
              <div className="characterLootHead">
                <div>
                  <strong>{entry.player}</strong>
                  <span>{entry.bosses.join(", ")}</span>
                </div>
                <div className="characterLootMetrics">
                  <span>
                    Registros
                    <strong>{entry.sessions}</strong>
                  </span>
                  <span>
                    Bosses
                    <strong>{entry.bosses.length}</strong>
                  </span>
                  <span>
                    Itens
                    <strong>{formatNumber(entry.quantity)}</strong>
                  </span>
                </div>
              </div>

              <div className="characterItemList">
                {entry.items.map((item) => (
                  <div className="characterItemRow" key={item.key}>
                    <div>
                      <strong>{item.item}</strong>
                      <span>{item.bossName}</span>
                    </div>
                    <span>{`${formatNumber(item.quantity)}x`}</span>
                    <em className={`lootTier tier-${categoryOrder(item.category)}`}>{item.bonus ? `${item.category} / bonus` : item.category}</em>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="lootLogList">
          {filtered.slice(0, visibleSessions).map((session) => (
            <article className="lootLogCard" key={session.id}>
              <div className="lootLogHead">
                <div>
                  <strong>{session.bossName}</strong>
                  <span>{session.player}</span>
                </div>
                <div className="lootLogMeta">
                  <span>{formatDate(session.date)}</span>
                  <span>{`registrado as ${formatTime(session.createdAt)}${session.registeredBy ? ` por ${session.registeredBy}` : ""}`}</span>
                </div>
              </div>
              <div className="lootChips">
                {session.items.map((item) => (
                  <span className={`lootChip tier-${categoryOrder(item.category)}`} key={`${session.id}-${item.item}`} title={item.category}>
                    {`${formatNumber(item.quantity)}x ${item.item}`}
                  </span>
                ))}
              </div>
            </article>
          ))}
          {filtered.length > visibleSessions ? (
            <button type="button" className="secondaryButton" onClick={() => setVisibleSessions((count) => count + HISTORY_PAGE_SIZE)}>
              <History size={16} />
              {`Mostrar mais (${filtered.length - visibleSessions} restantes)`}
            </button>
          ) : null}
        </div>
      )}

      {!filtered.length ? (
        <div className="emptyLootState">
          <Users size={22} />
          <p>{hasFilters ? "Nenhum drop encontrado com esses filtros." : "Nenhum loot registrado ainda."}</p>
        </div>
      ) : null}
    </section>
  );
}
