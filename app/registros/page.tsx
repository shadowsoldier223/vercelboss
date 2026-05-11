"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Plus, Search, Shield, Swords, Trophy } from "lucide-react";
import { RecordCard } from "@/components/RecordCard";
import { createEmptyFeat } from "@/lib/defaults";
import type { FeatType } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

const types: FeatType[] = ["Boss", "Hunt", "Conquista"];

export default function RegistrosPage() {
  const { currentUser, data, addFeat, isAdmin, removeFeat } = useAppData();
  const [form, setForm] = useState(createEmptyFeat("Hunt"));
  const [filter, setFilter] = useState<FeatType | "Todos">("Todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return data.feats
      .filter((feat) => filter === "Todos" || feat.type === filter)
      .filter((feat) =>
        `${feat.title} ${feat.character} ${feat.loot} ${feat.notes}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
  }, [data.feats, filter, query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;

    addFeat(form);
    setForm(createEmptyFeat(form.type));
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Registros</span>
        <h1>Entre para salvar registros</h1>
        <p>O login separa os usos do painel e libera as ferramentas de cadastro.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <section className="pageGrid">
      <aside className="panel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Registro manual</span>
            <h1>Nova entrada</h1>
          </div>
          <Plus size={22} />
        </div>

        <form className="entryForm" onSubmit={submit}>
          <div className="segmented">
            {types.map((type) => (
              <button
                type="button"
                className={form.type === type ? "active" : ""}
                onClick={() => setForm((current) => ({ ...current, type }))}
                key={type}
              >
                {type === "Boss" ? <Crown size={17} /> : null}
                {type === "Hunt" ? <Swords size={17} /> : null}
                {type === "Conquista" ? <Trophy size={17} /> : null}
                <span>{type}</span>
              </button>
            ))}
          </div>

          <label>
            Titulo
            <input
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Ex: Roshamuul, Level 500, Ferumbras"
            />
          </label>

          <label>
            Personagem
            <input
              value={form.character}
              onChange={(event) => setForm((current) => ({ ...current, character: event.target.value }))}
              placeholder="Nome do char"
            />
          </label>

          <label>
            Data
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </label>

          <label>
            Loot / resultado
            <input
              value={form.loot}
              onChange={(event) => setForm((current) => ({ ...current, loot: event.target.value }))}
              placeholder="Profit, rare, charm, level..."
            />
          </label>

          <label>
            Notas
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Time, estrategia, detalhe importante..."
            />
          </label>

          <button className="submitButton" type="submit">
            <Plus size={18} />
            Salvar registro
          </button>
        </form>
      </aside>

      <section className="recordsArea">
        <div className="toolbar">
          <div className="searchBox">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nos registros"
            />
          </div>
          <div className="filterGroup">
            {(["Todos", ...types] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="sectionTitle">
          <div>
            <span className="eyebrow">Historico</span>
            <h2>{filtered.length} registros</h2>
          </div>
        </div>

        <div className="recordList">
          {filtered.map((feat) => (
            <RecordCard feat={feat} onRemove={isAdmin ? removeFeat : undefined} key={feat.id} />
          ))}
        </div>
      </section>
    </section>
  );
}
