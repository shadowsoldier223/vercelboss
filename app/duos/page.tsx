"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock, Plus, RotateCcw, Shield, Trash2, Users, X } from "lucide-react";
import { LootRegistrationModal } from "@/components/LootRegistrationModal";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatReleaseAt, formatRemainingTime, formatTime, isCooldownActive } from "@/lib/format";
import type { Duo } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";
import { useNow } from "@/lib/useNow";

function describeDuo(duo: Duo, now: number) {
  const cooling = isCooldownActive(duo.cooldownUntil, now);
  const label = duo.status === "done" ? "OK" : "Fail";
  const markedAt = duo.markedAt ? `${label} em ${formatDate(duo.markedAt)} as ${formatTime(duo.markedAt)}` : "";

  return {
    cooling,
    badge: cooling ? label : "Pronto",
    tone: cooling ? (duo.status === "fail" ? "fail" : "done") : "ready",
    text: cooling
      ? `${markedAt} // libera em ${formatRemainingTime(duo.cooldownUntil, now)} (${formatReleaseAt(duo.cooldownUntil ?? "", now)})`
      : markedAt
        ? `Ultimo: ${markedAt} // pronto agora`
        : "Pronto agora",
    record: `${duo.kills ?? 0} ${(duo.kills ?? 0) === 1 ? "kill" : "kills"} / ${duo.fails ?? 0} ${(duo.fails ?? 0) === 1 ? "fail" : "fails"}`,
  };
}

export default function DuosPage() {
  const { currentUser, data, addDuo, isAdmin, markDuo, removeDuo, resetDuo } = useAppData();
  const now = useNow();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [formError, setFormError] = useState("");
  const [lootDuo, setLootDuo] = useState<Duo | null>(null);

  const duoBosses = useMemo(() => data.lootBosses.filter((boss) => boss.mode === "duo"), [data.lootBosses]);

  // Prontos primeiro; quem esta em cooldown fica ordenado por quem libera antes.
  const rows = useMemo(() => {
    return data.duos
      .map((duo) => ({ duo, ...describeDuo(duo, now) }))
      .sort((a, b) => {
        if (a.cooling !== b.cooling) return a.cooling ? 1 : -1;
        if (!a.cooling) return 0;

        return new Date(a.duo.cooldownUntil ?? 0).getTime() - new Date(b.duo.cooldownUntil ?? 0).getTime();
      });
  }, [data.duos, now]);

  const cooldownCount = rows.filter((row) => row.cooling).length;
  const nextRelease = rows.find((row) => row.cooling);
  const failCount = rows.filter((row) => row.cooling && row.duo.status === "fail").length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = addDuo(left, right);

    if (!result.ok) {
      setFormError(result.error ?? "Nao foi possivel adicionar essa dupla.");
      return;
    }

    setFormError("");
    setLeft("");
    setRight("");
  }

  function confirmIfCooling(duo: Duo, action: string) {
    if (!isCooldownActive(duo.cooldownUntil, Date.now())) return true;

    return window.confirm(`${duo.left} + ${duo.right} ainda esta em cooldown. ${action} mesmo assim?`);
  }

  function openLootModal(duo: Duo) {
    if (!duoBosses.length || !confirmIfCooling(duo, "Registrar o boss")) return;

    setLootDuo(duo);
  }

  function failDuo(duo: Duo) {
    if (!confirmIfCooling(duo, "Marcar fail")) return;

    markDuo(duo.id, "fail");
  }

  function deleteDuo(duo: Duo) {
    if (!window.confirm(`Remover a dupla ${duo.left} + ${duo.right}?`)) return;

    removeDuo(duo.id);
  }

  const closeLootModal = useCallback(() => setLootDuo(null), []);

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
        <p>Conclua o boss pelo check para registrar o loot e iniciar o cooldown de 20h. Fail tambem inicia o cooldown.</p>
      </section>

      <section className="statGrid">
        <StatCard icon={Users} label="Duos cadastrados" value={data.duos.length} />
        <StatCard icon={Check} label="Prontos" value={data.duos.length - cooldownCount} />
        <StatCard icon={Clock} label="Em cooldown" value={cooldownCount} />
        <StatCard icon={X} label="Fails em cooldown" value={failCount} />
      </section>

      {nextRelease && cooldownCount === rows.length ? (
        <p className="notice">
          {`Nenhum duo pronto agora. Proximo a liberar: ${nextRelease.duo.left} + ${nextRelease.duo.right} em ${formatRemainingTime(nextRelease.duo.cooldownUntil, now)} (${formatReleaseAt(nextRelease.duo.cooldownUntil ?? "", now)}).`}
        </p>
      ) : null}

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
            {formError ? <p className="errorNotice">{formError}</p> : null}
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
            {rows.map(({ duo, badge, tone, text, record }) => (
              <article className="duoRow" key={duo.id}>
                <div>
                  <span className={`duoBadge ${tone}`}>{badge}</span>
                  <strong>{duo.left} + {duo.right}</strong>
                  <p>{text}</p>
                  <p className="duoRecord">{record}</p>
                </div>
                {isAdmin ? (
                  <div className="rowActions">
                    <button
                      type="button"
                      title={duoBosses.length ? "Concluir boss (registrar loot e iniciar cooldown)" : "Cadastre um boss do tipo duo primeiro"}
                      onClick={() => openLootModal(duo)}
                      disabled={!duoBosses.length}
                    >
                      <Check size={16} />
                    </button>
                    <button type="button" title="Fail" onClick={() => failDuo(duo)}>
                      <X size={16} />
                    </button>
                    <button type="button" title="Resetar cooldown" onClick={() => resetDuo(duo.id)}>
                      <RotateCcw size={16} />
                    </button>
                    <button type="button" title="Remover" onClick={() => deleteDuo(duo)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
            {!rows.length ? <p className="mutedText">Nenhuma dupla cadastrada.</p> : null}
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
          onSkip={() => markDuo(lootDuo.id, "done")}
          skipLabel="Concluir sem registrar loot"
        />
      ) : null}
    </>
  );
}
