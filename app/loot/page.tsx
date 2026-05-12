"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Gem, Plus, RotateCcw, Shield } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { today } from "@/lib/defaults";
import { parseLootPaste } from "@/lib/loot";
import { useAppData } from "@/lib/useAppData";

export default function LootPage() {
  const { currentUser, data, isAdmin, stats, saveLootSession, undoLastLoot } = useAppData();
  const [bossKey, setBossKey] = useState("");
  const [player, setPlayer] = useState("");
  const [date, setDate] = useState(today());
  const [lootText, setLootText] = useState("");
  const [message, setMessage] = useState("");

  const lootBosses = data.lootBosses;
  const parsed = useMemo(() => parseLootPaste(lootText, bossKey, lootBosses), [lootText, bossKey, lootBosses]);

  useEffect(() => {
    if (!lootBosses.length) {
      setBossKey("");
      return;
    }

    if (!bossKey || !lootBosses.some((boss) => boss.key === bossKey)) {
      setBossKey(lootBosses[0].key);
    }
  }, [bossKey, lootBosses]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bossKey) {
      setMessage("Crie um boss na aba Bosses antes de salvar loot.");
      return;
    }

    const saved = saveLootSession({ bossKey, player, lootText, date });

    if (!saved.length) {
      setMessage("Preencha o personagem e cole um loot reconhecivel.");
      return;
    }

    setMessage(`${saved.length} drops salvos e um registro de boss criado.`);
    setLootText("");
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Loot</span>
        <h1>Entre para salvar loots</h1>
        <p>O parser cria drops e registros vinculados ao painel.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="pageHeader">
        <span className="eyebrow">Parser</span>
        <h1>Loot do reward chest</h1>
        <p>Cole a mensagem do loot, confira o resumo e salve por personagem.</p>
      </section>

      <section className="statGrid">
        <StatCard icon={Gem} label="Drops salvos" value={stats.drops} />
        <StatCard icon={Gem} label="Itens diferentes" value={stats.itemTotals.length} />
        <StatCard icon={Gem} label="Chars com loot" value={stats.characterTotals.length} />
        <StatCard icon={Gem} label="Preview atual" value={parsed.length} />
      </section>

      <section className="pageGrid">
        <aside className="panel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Salvar loot</span>
              <h2>Nova sessao</h2>
            </div>
            <Gem size={22} />
          </div>

          <form className="entryForm" onSubmit={submit}>
            <label>
              Boss
              <select value={bossKey} onChange={(event) => setBossKey(event.target.value)} disabled={!lootBosses.length}>
                {lootBosses.map((boss) => (
                  <option value={boss.key} key={boss.key}>{boss.label}</option>
                ))}
              </select>
            </label>
            {!lootBosses.length ? (
              <p className="mutedText">Nenhum boss cadastrado. Crie um boss na aba Bosses.</p>
            ) : null}

            <div className="fieldGrid">
              <label>
                Personagem
                <input value={player} onChange={(event) => setPlayer(event.target.value)} placeholder="Wanius Zack" />
              </label>
              <label>
                Data
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </div>

            <label>
              Texto do reward chest
              <textarea
                value={lootText}
                onChange={(event) => setLootText(event.target.value)}
                placeholder="You see the following items available in your reward chest: 23 crystal coins, 3 silver tokens..."
              />
            </label>

            <button className="submitButton" type="submit" disabled={!lootBosses.length}>
              <Plus size={18} />
              Salvar loot
            </button>
          </form>

          {isAdmin ? (
            <button className="secondaryButton" type="button" onClick={undoLastLoot}>
              <RotateCcw size={16} />
              Desfazer ultimo loot
            </button>
          ) : null}

          {message ? <p className="notice">{message}</p> : null}
        </aside>

        <section className="panel">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Preview</span>
              <h2>{parsed.length} drops reconhecidos</h2>
            </div>
          </div>

          <div className="tableList">
            {parsed.map(({ drop, quantity }) => (
              <div className="tableRow" key={drop.id}>
                <span>{drop.item}</span>
                <strong>{quantity}x</strong>
                <em>{drop.category}</em>
              </div>
            ))}
            {!parsed.length ? <p className="mutedText">Cole um loot para ver o preview.</p> : null}
          </div>
        </section>
      </section>
    </>
  );
}
