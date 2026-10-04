"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Download, Gem, History, Search, Shield } from "lucide-react";
import { today } from "@/lib/defaults";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import {
  buildLootSessions,
  buildPlayerLoot,
  buildUserLoot,
  categoryOrder,
  filterLootSessions,
  type PlayerItemTotal,
  type PlayerLoot,
} from "@/lib/lootView";
import { useAppData } from "@/lib/useAppData";

type View = "personagens" | "usuarios" | "historico";

const HISTORY_PAGE_SIZE = 20;
const PREVIEW_ITEMS = 5;

const viewLabels: { key: View; label: string }[] = [
  { key: "personagens", label: "Personagens" },
  { key: "usuarios", label: "Usuarios" },
  { key: "historico", label: "Historico" },
];

type ChipItem = { item: string; quantity: number; category: string; bonus?: boolean };

function ItemChip({ item }: { item: ChipItem }) {
  return (
    <span className={`lootChip tier-${categoryOrder(item.category)}${item.bonus ? " bonus" : ""}`} title={item.bonus ? `${item.category} / bonus` : item.category}>
      <b>{`${formatNumber(item.quantity)}x`}</b> {item.item}
    </span>
  );
}

/** Itens agrupados por boss, cada boss em uma linha com seus chips. */
function BossGroups({ items }: { items: PlayerItemTotal[] }) {
  const groups = new Map<string, PlayerItemTotal[]>();

  for (const item of items) {
    groups.set(item.bossName, [...(groups.get(item.bossName) ?? []), item]);
  }

  return (
    <div className="lootBossGroups">
      {Array.from(groups, ([boss, bossItems]) => (
        <div className="lootBossRow" key={boss}>
          <span className="lootBossName">{boss}</span>
          <div className="lootChips">
            {bossItems.map((item) => (
              <ItemChip item={item} key={item.key} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LootCard({
  name,
  meta,
  sessions,
  quantity,
  rare,
  preview,
  open,
  onToggle,
  children,
}: {
  name: string;
  meta: string;
  sessions: number;
  quantity: number;
  rare: number;
  preview: PlayerItemTotal[];
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const extra = Math.max(0, preview.length - PREVIEW_ITEMS);

  return (
    <article className={`lootCard${open ? " open" : ""}`}>
      <button type="button" className="lootCardHead" onClick={onToggle} aria-expanded={open}>
        <span className="lootAvatar" aria-hidden="true">
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span className="lootCardTitle">
          <strong>{name}</strong>
          <small>{meta}</small>
        </span>
        <span className="lootCardStats">
          <span>
            <strong>{sessions}</strong> reg.
          </span>
          <span>
            <strong>{formatNumber(quantity)}</strong> itens
          </span>
          {rare ? (
            <span className="rare">
              <strong>{formatNumber(rare)}</strong> raros
            </span>
          ) : null}
        </span>
        <ChevronDown className="lootChevron" size={18} aria-hidden="true" />
      </button>

      {!open && preview.length ? (
        <div className="lootPreview">
          {preview.slice(0, PREVIEW_ITEMS).map((item) => (
            <ItemChip item={item} key={item.key} />
          ))}
          {extra ? <span className="lootMore">{`+${extra}`}</span> : null}
        </div>
      ) : null}

      {open ? <div className="lootCardBody">{children}</div> : null}
    </article>
  );
}

function CharacterBody({ character, showUsers }: { character: PlayerLoot; showUsers: boolean }) {
  return (
    <>
      <BossGroups items={character.items} />
      {showUsers && character.registeredBy.length ? (
        <p className="lootFootnote">{`Registrado por ${character.registeredBy.join(", ")}`}</p>
      ) : null}
    </>
  );
}

export default function LootPage() {
  const { currentUser, data, hasLoaded } = useAppData();
  const [view, setView] = useState<View>("personagens");
  const [query, setQuery] = useState("");
  const [bossKey, setBossKey] = useState("");
  const [visibleSessions, setVisibleSessions] = useState(HISTORY_PAGE_SIZE);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const sessions = useMemo(() => buildLootSessions(data.drops), [data.drops]);
  const bossOptions = useMemo(() => {
    const bosses = new Map<string, string>();

    for (const session of sessions) bosses.set(session.bossKey, session.bossName);

    return Array.from(bosses, ([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [sessions]);
  const filtered = useMemo(() => filterLootSessions(sessions, { bossKey, query }), [sessions, bossKey, query]);
  const characters = useMemo(() => buildPlayerLoot(filtered), [filtered]);
  const users = useMemo(() => buildUserLoot(filtered), [filtered]);

  const totals = useMemo(() => {
    const all = buildPlayerLoot(sessions);

    return {
      quantity: all.reduce((total, entry) => total + entry.quantity, 0),
      rare: all.reduce((total, entry) => total + entry.rare, 0),
      characters: all.length,
      users: new Set(sessions.map((session) => session.registeredBy.toLowerCase())).size,
    };
  }, [sessions]);

  const hasFilters = Boolean(query.trim() || bossKey);
  const cardKeys = view === "personagens" ? characters.map((entry) => `p:${entry.key}`) : view === "usuarios" ? users.map((entry) => `u:${entry.key}`) : [];
  const allOpen = cardKeys.length > 0 && cardKeys.every((key) => open[key]);

  function toggle(key: string) {
    setOpen((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleAll() {
    setOpen((current) => ({ ...current, ...Object.fromEntries(cardKeys.map((key) => [key, !allOpen])) }));
  }

  function resetPaging() {
    setVisibleSessions(HISTORY_PAGE_SIZE);
  }

  function exportCsv() {
    // Evita que planilhas interpretem textos iniciados por = + - @ como formulas.
    const cell = (value: string) => {
      const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;

      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = [["Data", "Boss", "Personagem", "Item", "Quantidade", "Raridade", "Usuario", "Registrado em"]];

    for (const session of filtered) {
      for (const item of session.items) {
        rows.push([
          formatDate(session.date),
          session.bossName,
          session.player,
          item.item,
          String(item.quantity),
          item.category,
          session.registeredBy,
          `${formatDate(session.createdAt)} ${formatTime(session.createdAt)}`,
        ]);
      }
    }

    const csv = `\uFEFF${rows.map((row) => row.map(cell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `loot-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      <div className="lootHeader">
        <div>
          <span className="eyebrow">Somente leitura</span>
          <h1>Registro de loot</h1>
        </div>
        <div className="lootPills">
          <span className="lootPill">
            <strong>{formatNumber(sessions.length)}</strong> registros
          </span>
          <span className="lootPill">
            <strong>{formatNumber(totals.quantity)}</strong> itens
          </span>
          <span className="lootPill rare">
            <strong>{formatNumber(totals.rare)}</strong> raros
          </span>
          <span className="lootPill">
            <strong>{totals.characters}</strong> personagens
          </span>
          <span className="lootPill">
            <strong>{totals.users}</strong> usuarios
          </span>
        </div>
      </div>

      <div className="lootToolbar">
        <div className="searchBox">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPaging();
            }}
            placeholder="Buscar personagem, boss ou item"
            aria-label="Buscar loot"
          />
        </div>
        <select
          value={bossKey}
          onChange={(event) => {
            setBossKey(event.target.value);
            resetPaging();
          }}
          aria-label="Filtrar por boss"
        >
          <option value="">Todos os bosses</option>
          {bossOptions.map((boss) => (
            <option value={boss.key} key={boss.key}>
              {boss.label}
            </option>
          ))}
        </select>
        <div className="lootTabs" role="tablist" aria-label="Modo de visualizacao">
          {viewLabels.map((entry) => (
            <button
              type="button"
              role="tab"
              aria-selected={view === entry.key}
              className={view === entry.key ? "active" : ""}
              onClick={() => setView(entry.key)}
              key={entry.key}
            >
              {entry.label}
            </button>
          ))}
        </div>
        {cardKeys.length > 1 ? (
          <button type="button" className="lootIconButton" onClick={toggleAll} title={allOpen ? "Recolher tudo" : "Expandir tudo"} aria-label={allOpen ? "Recolher tudo" : "Expandir tudo"}>
            {allOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        ) : null}
        <button type="button" className="lootIconButton" onClick={exportCsv} disabled={!filtered.length} title="Baixar os registros filtrados em CSV" aria-label="Exportar CSV">
          <Download size={16} />
        </button>
      </div>

      {view === "personagens" ? (
        <div className="lootList">
          {characters.map((entry) => (
            <LootCard
              key={entry.key}
              name={entry.player}
              meta={entry.bosses.join(", ")}
              sessions={entry.sessions}
              quantity={entry.quantity}
              rare={entry.rare}
              preview={entry.items}
              open={Boolean(open[`p:${entry.key}`])}
              onToggle={() => toggle(`p:${entry.key}`)}
            >
              <CharacterBody character={entry} showUsers />
            </LootCard>
          ))}
        </div>
      ) : null}

      {view === "usuarios" ? (
        <div className="lootList">
          {users.map((entry) => (
            <LootCard
              key={entry.key}
              name={entry.user}
              meta={`${entry.characters.length} ${entry.characters.length === 1 ? "personagem" : "personagens"}`}
              sessions={entry.sessions}
              quantity={entry.quantity}
              rare={entry.rare}
              preview={entry.items}
              open={Boolean(open[`u:${entry.key}`])}
              onToggle={() => toggle(`u:${entry.key}`)}
            >
              {entry.characters.map((character) => (
                <div className="lootSub" key={character.key}>
                  <div className="lootSubHead">
                    <strong>{character.player}</strong>
                    <span>{`${character.sessions} reg. / ${formatNumber(character.quantity)} itens${character.rare ? ` / ${formatNumber(character.rare)} raros` : ""}`}</span>
                  </div>
                  <CharacterBody character={character} showUsers={false} />
                </div>
              ))}
            </LootCard>
          ))}
        </div>
      ) : null}

      {view === "historico" ? (
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
                  <span>{`${formatTime(session.createdAt)}${session.registeredBy ? ` / ${session.registeredBy}` : ""}`}</span>
                </div>
              </div>
              <div className="lootChips">
                {session.items.map((item) => (
                  <ItemChip item={item} key={`${session.id}-${item.item}`} />
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
      ) : null}

      {!filtered.length ? (
        <div className="emptyLootState">
          <Gem size={22} />
          <p>{hasFilters ? "Nenhum drop encontrado com esses filtros." : "Nenhum loot registrado ainda."}</p>
        </div>
      ) : null}
    </section>
  );
}
