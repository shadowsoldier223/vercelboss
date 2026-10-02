"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock, Gem, Plus, RotateCcw, Shield, Trash2, Users, X } from "lucide-react";
import { LootRegistrationModal } from "@/components/LootRegistrationModal";
import { StatCard } from "@/components/StatCard";
import { formatRemainingTime, formatTime, isCooldownActive } from "@/lib/format";
import type { Duo } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

export default function DuosPage() {
  const { currentUser, data, addDuo, isAdmin, markDuo, removeDuo, resetDuo } = useAppData();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [lootDuo, setLootDuo] = useState<Duo | null>(null);

  const cooldowns = useMemo(
    () => data.duos.filter((duo) => isCooldownActive(duo.cooldownUntil)),
    [data.duos],
  );
  const ready = data.duos.length - cooldowns.length;
  const duoBosses = useMemo(() => data.lootBosses.filter((boss) => boss.mode === "duo"), [data.lootBosses]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addDuo(left, right);
    setLeft("");
    setRight("");
  }

  function openLootModal(duo: Duo) {
    if (!duoBosses.length) return;

    setLootDuo(duo);
  }

  function closeLootModal() {
    setLootDuo(null);
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
                    <button
                      type="button"
                      title={duoBosses.length ? "Registrar loot e marcar OK" : "Cadastre um boss do tipo duo primeiro"}
                      onClick={() => openLootModal(duo)}
                      disabled={!duoBosses.length}
                    >
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
        <LootRegistrationModal
          bosses={duoBosses}
          defaultPlayer={`${lootDuo.left} + ${lootDuo.right}`}
          title={`${lootDuo.left} + ${lootDuo.right}`}
          onClose={closeLootModal}
          onSaved={() => markDuo(lootDuo.id, "done")}
        />
      ) : null}
    </>
  );
}
