"use client";

import { useMemo } from "react";
import { formatNumber, formatSignedNumber } from "@/lib/format";
import type { Duo, HuntSession } from "@/lib/types";

type Entry = { name: string; value: string; detail: string };

const TOP = 5;

function RankingList({ title, eyebrow, entries, empty }: { title: string; eyebrow: string; entries: Entry[]; empty: string }) {
  return (
    <section className="panel rankingPanel">
      <div className="sectionTitle">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <ol className="rankingList">
        {entries.map((entry, index) => (
          <li key={entry.name}>
            <span className={`rankingPos pos-${index + 1}`}>{index + 1}</span>
            <div>
              <strong>{entry.name}</strong>
              <small>{entry.detail}</small>
            </div>
            <em className={entry.value.startsWith("-") ? "neg" : ""}>{entry.value}</em>
          </li>
        ))}
      </ol>
      {!entries.length ? <p className="mutedText">{empty}</p> : null}
    </section>
  );
}

/** Rankings do grupo, calculados so com dados que o painel ja guarda (hunts e duos). */
export function Rankings({ hunts, duos }: { hunts: HuntSession[]; duos: Duo[] }) {
  const { balance, xp, duoKills } = useMemo(() => {
    const byCharacter = new Map<string, { name: string; hunts: number; balance: number; xpHourTotal: number; xpHourCount: number }>();

    for (const hunt of hunts) {
      const name = hunt.character?.trim() || hunt.userName;
      const key = name.toLowerCase();
      const entry = byCharacter.get(key) ?? { name, hunts: 0, balance: 0, xpHourTotal: 0, xpHourCount: 0 };

      entry.hunts += 1;
      entry.balance += hunt.balance;

      if (hunt.experienceHour > 0) {
        entry.xpHourTotal += hunt.experienceHour;
        entry.xpHourCount += 1;
      }

      byCharacter.set(key, entry);
    }

    const all = Array.from(byCharacter.values());

    return {
      balance: [...all]
        .sort((a, b) => b.balance - a.balance)
        .slice(0, TOP)
        .map((entry) => ({ name: entry.name, value: formatSignedNumber(entry.balance), detail: `${entry.hunts} ${entry.hunts === 1 ? "hunt" : "hunts"}` })),
      xp: all
        .filter((entry) => entry.xpHourCount > 0)
        .map((entry) => ({ ...entry, average: Math.round(entry.xpHourTotal / entry.xpHourCount) }))
        .sort((a, b) => b.average - a.average)
        .slice(0, TOP)
        .map((entry) => ({ name: entry.name, value: `${formatNumber(entry.average)}/h`, detail: `media de ${entry.xpHourCount} ${entry.xpHourCount === 1 ? "hunt" : "hunts"}` })),
      duoKills: duos
        .filter((duo) => (duo.kills ?? 0) > 0)
        .sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0) || (a.fails ?? 0) - (b.fails ?? 0))
        .slice(0, TOP)
        .map((duo) => ({
          name: `${duo.left} + ${duo.right}`,
          value: `${duo.kills} ${duo.kills === 1 ? "kill" : "kills"}`,
          detail: `${duo.fails ?? 0} ${(duo.fails ?? 0) === 1 ? "fail" : "fails"}`,
        })),
    };
  }, [hunts, duos]);

  return (
    <section className="rankingGrid" aria-label="Rankings do grupo">
      <RankingList eyebrow="Hunts" title="Maior balance" entries={balance} empty="Registre hunts para montar o ranking." />
      <RankingList eyebrow="Hunts" title="Melhor XP/h medio" entries={xp} empty="Hunts com XP/h aparecem aqui." />
      <RankingList eyebrow="Duos" title="Mais kills" entries={duoKills} empty="Conclua um boss na aba Duos para pontuar." />
    </section>
  );
}

