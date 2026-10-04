"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Crown, Gem, Plus, Search, Shield, Trash2 } from "lucide-react";
import { LootRegistrationModal } from "@/components/LootRegistrationModal";
import { useAppData } from "@/lib/useAppData";
import type { LootBoss } from "@/lib/types";

export default function BossesPage() {
  const { addLootBoss, currentUser, data, isAdmin, removeLootBoss, updateLootBoss } = useAppData();
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<LootBoss["mode"]>("solo");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [lootBoss, setLootBoss] = useState<LootBoss | null>(null);

  const bosses = useMemo(() => {
    return data.lootBosses.filter((boss) =>
      `${boss.label} ${boss.mode}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [data.lootBosses, query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = addLootBoss({ label, mode });

    if (!created) {
      setMessage("Nao foi possivel criar esse boss.");
      return;
    }

    setLabel("");
    setMode("solo");
    setMessage("Boss criado e disponivel para registrar loot.");
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Bosses</span>
        <h1>Entre para ver os bosses</h1>
        <p>Administradores podem adicionar e remover bosses. Todos registram o loot de bosses solo aqui.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <section className="pageGrid">
      {isAdmin ? (
        <aside className="panel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Bosses</span>
              <h1>Novo boss</h1>
            </div>
            <Crown size={22} />
          </div>

          <form className="entryForm" onSubmit={submit}>
            <label>
              Nome do boss
              <input
                required
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Ex: Bakragore, Gaz'haragoth, Scarlett"
              />
            </label>

            <label>
              Tipo
              <select value={mode} onChange={(event) => setMode(event.target.value as LootBoss["mode"])}>
                <option value="solo">Solo</option>
                <option value="duo">Duo</option>
              </select>
            </label>

            <button className="submitButton" type="submit">
              <Plus size={18} />
              Criar boss
            </button>
          </form>

          {message ? <p className="notice">{message}</p> : null}
        </aside>
      ) : (
        <aside className="panel readonlyPanel">
          <Crown size={24} />
          <h1>Bosses em modo leitura</h1>
          <p>Somente administradores podem alterar a lista de bosses.</p>
        </aside>
      )}

      <section className="recordsArea">
        <div className="toolbar">
          <div className="searchBox">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar boss"
            />
          </div>
        </div>

        <div className="sectionTitle">
          <div>
            <span className="eyebrow">Cadastrados</span>
            <h2>{bosses.length} bosses cadastrados</h2>
          </div>
        </div>

        <div className="duoList">
          {bosses.map((boss) => (
            <article className="duoRow" key={boss.key}>
              <div>
                <span className="duoIndex"><Crown size={14} /></span>
                {isAdmin ? (
                  <input
                    className="inlineEdit"
                    defaultValue={boss.label}
                    onBlur={(event) => updateLootBoss(boss.key, { label: event.target.value })}
                  />
                ) : (
                  <strong>{boss.label}</strong>
                )}
                <p>{boss.mode === "duo" ? "Duo boss / registre a conclusao na aba Duos" : "Solo boss / registre o loot aqui"}</p>
              </div>
              {isAdmin ? (
                <div className="rowActions">
                  <select
                    value={boss.mode}
                    onChange={(event) => updateLootBoss(boss.key, { mode: event.target.value as LootBoss["mode"] })}
                    title="Tipo"
                  >
                    <option value="solo">Solo</option>
                    <option value="duo">Duo</option>
                  </select>
                  <button type="button" title="Remover" onClick={() => removeLootBoss(boss.key)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : null}
              {boss.mode === "solo" ? (
                <div className="rowActions">
                  <button type="button" title="Registrar loot" onClick={() => setLootBoss(boss)}>
                    <Gem size={16} />
                    Registrar loot
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {!bosses.length ? <p className="mutedText">Nenhum boss encontrado.</p> : null}
        </div>
      </section>

      {lootBoss ? (
        <LootRegistrationModal
          bosses={[lootBoss]}
          defaultPlayer={currentUser.username}
          title={lootBoss.label}
          onClose={() => setLootBoss(null)}
        />
      ) : null}
    </section>
  );
}
