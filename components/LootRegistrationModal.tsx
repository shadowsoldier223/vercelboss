"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Gem, X } from "lucide-react";
import { today } from "@/lib/defaults";
import { parseLootPaste } from "@/lib/loot";
import type { LootBoss } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

type LootRegistrationModalProps = {
  bosses: LootBoss[];
  defaultPlayer: string;
  title: string;
  onClose: () => void;
  onSaved?: () => void;
  /** Quando informado, mostra um botao para concluir o boss sem registrar loot. */
  onSkip?: () => void;
  skipLabel?: string;
};

export function LootRegistrationModal({
  bosses,
  defaultPlayer,
  title,
  onClose,
  onSaved,
  onSkip,
  skipLabel = "Concluir sem loot",
}: LootRegistrationModalProps) {
  const { data, saveLootSession } = useAppData();
  const [bossKey, setBossKey] = useState(bosses[0]?.key ?? "");
  const [player, setPlayer] = useState(defaultPlayer);
  const [date, setDate] = useState(today());
  const [lootText, setLootText] = useState("");
  const [message, setMessage] = useState("");
  const parsedLoot = useMemo(() => parseLootPaste(lootText, bossKey, data.lootBosses), [bossKey, data.lootBosses, lootText]);

  useEffect(() => {
    if (!bosses.some((boss) => boss.key === bossKey)) {
      setBossKey(bosses[0]?.key ?? "");
    }
  }, [bossKey, bosses]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function skip() {
    onSkip?.();
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const saved = saveLootSession({ bossKey, player, lootText, date });

    if (!saved.length) {
      setMessage("Preencha o personagem e cole um loot reconhecivel.");
      return;
    }

    onSaved?.();
    onClose();
  }

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Registrar loot do boss">
      <section className="lootModal">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Conclusao do boss</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="iconButton" onClick={onClose} title="Fechar">
            <X size={17} />
          </button>
        </div>

        <form className="entryForm" onSubmit={submit}>
          <label>
            Boss
            <select value={bossKey} onChange={(event) => setBossKey(event.target.value)}>
              {bosses.map((boss) => (
                <option value={boss.key} key={boss.key}>{boss.label}</option>
              ))}
            </select>
          </label>

          <div className="fieldGrid">
            <label>
              Personagem / dupla
              <input value={player} onChange={(event) => setPlayer(event.target.value)} />
            </label>
            <label>
              Data
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>

          <label>
            Texto do reward chest
            <textarea
              className="largeTextarea"
              value={lootText}
              onChange={(event) => setLootText(event.target.value)}
              placeholder="You see the following items available in your reward chest: 23 crystal coins, 3 silver tokens..."
            />
          </label>

          <div className="modalPreview">
            <div className="sectionTitle">
              <div>
                <span className="eyebrow">Preview</span>
                <h2>{parsedLoot.length} drops reconhecidos</h2>
              </div>
              <Gem size={20} />
            </div>
            <div className="tableList">
              {parsedLoot.slice(0, 8).map(({ drop, quantity }) => (
                <div className="tableRow" key={drop.id}>
                  <span>{drop.item}</span>
                  <strong>{quantity}x</strong>
                  <em>{drop.category}</em>
                </div>
              ))}
              {!parsedLoot.length ? <p className="mutedText">Cole o loot para ver o preview.</p> : null}
            </div>
          </div>

          <button className="submitButton" type="submit">
            <Gem size={18} />
            Registrar loot
          </button>
          {onSkip ? (
            <button className="secondaryButton" type="button" onClick={skip}>
              {skipLabel}
            </button>
          ) : null}
        </form>

        {message ? <p className="errorNotice">{message}</p> : null}
      </section>
    </div>
  );
}
