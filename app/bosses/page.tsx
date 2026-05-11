"use client";

import { FormEvent, useMemo, useState } from "react";
import { Crown, Plus, Search } from "lucide-react";
import { RecordCard } from "@/components/RecordCard";
import { createEmptyFeat } from "@/lib/defaults";
import { useAppData } from "@/lib/useAppData";

export default function BossesPage() {
  const { data, addFeat, removeFeat } = useAppData();
  const [form, setForm] = useState(createEmptyFeat("Boss"));
  const [query, setQuery] = useState("");

  const bosses = useMemo(() => {
    return data.feats
      .filter((feat) => feat.type === "Boss")
      .filter((feat) =>
        `${feat.title} ${feat.character} ${feat.place} ${feat.loot}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
  }, [data.feats, query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;

    addFeat({ ...form, type: "Boss" });
    setForm(createEmptyFeat("Boss"));
  }

  return (
    <section className="pageGrid">
      <aside className="panel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Boss tracker</span>
            <h1>Registrar boss</h1>
          </div>
          <Crown size={22} />
        </div>

        <form className="entryForm" onSubmit={submit}>
          <label>
            Boss
            <input
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Necrolune, Nocturnia, Ferumbras..."
            />
          </label>

          <div className="fieldGrid">
            <label>
              Personagem
              <input
                value={form.character}
                onChange={(event) => setForm((current) => ({ ...current, character: event.target.value }))}
                placeholder="Quem participou"
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
          </div>

          <label>
            Local
            <input
              value={form.place}
              onChange={(event) => setForm((current) => ({ ...current, place: event.target.value }))}
              placeholder="Sala, quest ou reward chest"
            />
          </label>

          <label>
            Loot
            <input
              value={form.loot}
              onChange={(event) => setForm((current) => ({ ...current, loot: event.target.value }))}
              placeholder="Itens importantes"
            />
          </label>

          <label>
            Observacoes
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Time, horario, split, print..."
            />
          </label>

          <button className="submitButton" type="submit">
            <Plus size={18} />
            Salvar boss
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
              placeholder="Buscar boss, char ou loot"
            />
          </div>
        </div>

        <div className="sectionTitle">
          <div>
            <span className="eyebrow">Bosses salvos</span>
            <h2>{bosses.length} abates registrados</h2>
          </div>
        </div>

        <div className="recordList">
          {bosses.map((feat) => (
            <RecordCard feat={feat} onRemove={removeFeat} key={feat.id} />
          ))}
        </div>
      </section>
    </section>
  );
}
