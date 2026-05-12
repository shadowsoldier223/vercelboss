"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock, Gem, Plus, RotateCcw, Shield, Trash2, Users, X } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { today } from "@/lib/defaults";
import { formatRemainingTime, formatTime, isCooldownActive } from "@/lib/format";
import { parseLootPaste } from "@/lib/loot";
import type { Duo } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

export default function DuosPage() {
  const { currentUser, data, addDuo, isAdmin, markDuo, removeDuo, resetDuo, saveLootSession } = useAppData();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [lootDuo, setLootDuo] = useState<Duo | null>(null);
  const [bossKey, setBossKey] = useState("");
  const [lootPlayer, setLootPlayer] = useState("");
  const [lootDate, setLootDate] = useState(today());
  const [lootText, setLootText] = useState("");
  const [lootMessage, setLootMessage] = useState("");

  const cooldowns = useMemo(
    () => data.duos.filter((duo) => isCooldownActive(duo.cooldownUntil)),
    [data.duos],
  );
  const ready = data.duos.length - cooldowns.length;
  const parsedLoot = useMemo(
    () => parseLootPaste(lootText, bossKey, data.lootBosses),
    [bossKey, data.lootBosses, lootText],
  );

  useEffect(() => {
    if (!data.lootBosses.length) {
      setBossKey("");
      return;
    }

    if (!bossKey || !data.lootBosses.some((boss) => boss.key === bossKey)) {
      setBossKey(data.lootBosses[0].key);
    }
  }, [bossKey, data.lootBosses]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addDuo(left, right);
    setLeft("");
    setRight("");
  }

  function openLootModal(duo: Duo) {
    setLootDuo(duo);
    setLootPlayer(`${duo.left} + ${duo.right}`);
    setLootDate(today());
    setLootText("");
    setLootMessage("");
  }

  function closeLootModal() {
    setLootDuo(null);
    setLootMessage("");
  }

  function markDoneWithoutLoot() {
    if (!lootDuo) return;

    markDuo(lootDuo.id, "done");
    closeLootModal();
  }

  function submitLoot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lootDuo) return;

    if (!bossKey) {
      setLootMessage("Crie um boss na aba Bosses antes de salvar loot.");
      return;
    }

    const saved = saveLootSession({ bossKey, player: lootPlayer, lootText, date: lootDate });

    if (!saved.length) {
      setLootMessage("Preencha a dupla e cole um loot reconhecivel.");
      return;
    }

    markDuo(lootDuo.id, "done");
    closeLootModal();
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Duos</span>
        <h1>Entre para ver os duos</h1>
        <p>Administradores podem adicionar, marcar, resetar e remover duplas.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="pageHeader">
        <span className="eyebrow">Lista diaria</span>
        <h1>Duos e cooldown</h1>
        <p>Marque OK ou fail e o painel calcula 20h de cooldown.</p>
      </section>

      <section className="statGrid">
        <StatCard icon={Users} label="Duos cadastrados" value={data.duos.length} />
        <StatCard icon={Check} label="Prontos" value={ready} />
        <StatCard icon={Clock} label="Cooldown" value={cooldowns.length} />
        <StatCard icon={X} label="Fails" value={data.duos.filter((duo) => duo.status === "fail").length} />
      </section>

      <section className="pageGrid duoGrid">
        {isAdmin ? (
          <aside className="panel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Adicionar</span>
                <h2>Nova dupla</h2>
              </div>
              <Plus size={22} />
            </div>
            <form className="entryForm" onSubmit={submit}>
              <label>
                Jogador 1
                <input value={left} onChange={(event) => setLeft(event.target.value)} placeholder="Eligos" />
              </label>
              <label>
                Jogador 2
                <input value={right} onChange={(event) => setRight(event.target.value)} placeholder="Malvadinho" />
              </label>
              <button className="submitButton" type="submit">
                <Plus size={18} />
                Adicionar duo
              </button>
            </form>
          </aside>
        ) : (
          <aside className="panel readonlyPanel">
            <Users size={24} />
            <h2>Duos em modo leitura</h2>
            <p>Somente administradores podem alterar cooldowns e lista de duplas.</p>
          </aside>
        )}

        <section className="panel">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Controle</span>
              <h2>Lista de duos</h2>
            </div>
          </div>

          <div className="duoList">
            {data.duos.map((duo, index) => (
              <article className="duoRow" key={duo.id}>
                <div>
                  <span className="duoIndex">{index + 1}</span>
                  <strong>{duo.left} + {duo.right}</strong>
                  <p>
                    {duo.markedAt ? `${duo.status === "done" ? "OK" : "Fail"} ${formatTime(duo.markedAt)} // ` : ""}
                    {isCooldownActive(duo.cooldownUntil)
                      ? `libera ${formatRemainingTime(duo.cooldownUntil)}`
                      : "pronto agora"}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="rowActions">
                    <button type="button" title="OK" onClick={() => openLootModal(duo)}>
                      <Check size={16} />
                    </button>
                    <button type="button" title="Fail" onClick={() => markDuo(duo.id, "fail")}>
                      <X size={16} />
                    </button>
                    <button type="button" title="Resetar" onClick={() => resetDuo(duo.id)}>
                      <RotateCcw size={16} />
                    </button>
                    <button type="button" title="Remover" onClick={() => removeDuo(duo.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </section>

      {lootDuo ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Salvar loot do boss">
          <section className="lootModal">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Loot do boss</span>
                <h2>{lootDuo.left} + {lootDuo.right}</h2>
              </div>
              <button type="button" className="iconButton" onClick={closeLootModal} title="Fechar">
                <X size={17} />
              </button>
            </div>

            <form className="entryForm" onSubmit={submitLoot}>
              <label>
                Boss
                <select value={bossKey} onChange={(event) => setBossKey(event.target.value)} disabled={!data.lootBosses.length}>
                  {data.lootBosses.map((boss) => (
                    <option value={boss.key} key={boss.key}>{boss.label}</option>
                  ))}
                </select>
              </label>

              <div className="fieldGrid">
                <label>
                  Personagem / dupla
                  <input value={lootPlayer} onChange={(event) => setLootPlayer(event.target.value)} />
                </label>
                <label>
                  Data
                  <input type="date" value={lootDate} onChange={(event) => setLootDate(event.target.value)} />
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

              <div className="modalActions">
                <button type="button" className="secondaryButton" onClick={markDoneWithoutLoot}>
                  <Check size={16} />
                  Marcar OK sem loot
                </button>
                <button className="submitButton" type="submit" disabled={!data.lootBosses.length}>
                  <Gem size={18} />
                  Salvar loot e marcar OK
                </button>
              </div>
            </form>

            {lootMessage ? <p className="errorNotice">{lootMessage}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
