"use client";

import Link from "next/link";
import { BarChart3, Crown, Gem, Shield, Swords, Trophy } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { formatSignedNumber } from "@/lib/format";
import { useAppData } from "@/lib/useAppData";

export default function EstatisticasPage() {
  const { currentUser, hasLoaded, stats } = useAppData();

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
      <section className="pageHeader">
        <span className="eyebrow">Resumo</span>
        <h1>Estatisticas</h1>
        <p>Totais por registro, item e personagem, usando os dados salvos no navegador.</p>
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
    </>
  );
}
