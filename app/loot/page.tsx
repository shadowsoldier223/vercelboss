"use client";

import { FormEvent, useMemo, useState } from "react";
import { Gem, Plus, RotateCcw } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { today } from "@/lib/defaults";
import { lootBosses, parseLootPaste } from "@/lib/loot";
import { useAppData } from "@/lib/useAppData";

export default function LootPage() {
  const { stats, saveLootSession, undoLastLoot } = useAppData();
  const [bossKey, setBossKey] = useState(lootBosses[0].key);
  const [player, setPlayer] = useState("");
  const [date, setDate] = useState(today());
  const [lootText, setLootText] = useState("");
  const [message, setMessage] = useState("");

  const parsed = useMemo(() => parseLootPaste(lootText, bossKey), [lootText, bossKey]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = saveLootSession({ bossKey, player, lootText, date });

    if (!saved.length) {
      setMessage("Preencha o personagem e cole um loot reconhecivel.");
      return;
    }

    setMessage(`${saved.length} drops salvos e um registro de boss criado.`);
    setLootText("");
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
              <select value={bossKey} onChange={(event) => setBossKey(event.target.value)}>
                {lootBosses.map((boss) => (
                  <option value={boss.key} key={boss.key}>{boss.label}</option>
                ))}
              </select>
            </label>

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

            <button className="submitButton" type="submit">
              <Plus size={18} />
              Salvar loot
            </button>
          </form>

          <button className="secondaryButton" type="button" onClick={undoLastLoot}>
            <RotateCcw size={16} />
            Desfazer ultimo loot
          </button>

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
