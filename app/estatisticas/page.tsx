"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Crown, Gem, RefreshCw, Shield, Swords, Trash2, Trophy } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatNumber, formatSignedNumber, formatTime } from "@/lib/format";
import { useAppData } from "@/lib/useAppData";

export default function EstatisticasPage() {
  const { currentUser, data, hasLoaded, isAdmin, refreshData, removeLootSession, stats } = useAppData();
  const [isRefreshing, setIsRefreshing] = useState(false);
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

    for (const drop of data.drops) {
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
  }, [data.drops]);

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
            {stats.itemTotals.map((entry) => (
              <div className="tableRow" key={entry.item}>
                <span>{entry.item}</span>
                <strong>{entry.quantity}x</strong>
                <em>{entry.category}</em>
              </div>
            ))}
            {!stats.itemTotals.length ? <p className="mutedText">Ainda nao tem drops salvos.</p> : null}
          </div>
        </div>

        <div className="panel">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Personagens</span>
              <h2>Total por char</h2>
            </div>
            <BarChart3 size={22} />
          </div>
          <div className="tableList">
            {stats.characterTotals.map((entry) => (
              <div className="tableRow" key={entry.player}>
                <span>{entry.player}</span>
                <strong>{entry.quantity} drops</strong>
                <em>loot</em>
              </div>
            ))}
            {!stats.characterTotals.length ? <p className="mutedText">Ainda nao tem personagens com loot.</p> : null}
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
