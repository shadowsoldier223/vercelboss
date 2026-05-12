"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Activity, Coins, Gauge, Plus, Swords, Trash2, Zap } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { today } from "@/lib/defaults";
import { formatDate, formatNumber, formatSignedNumber } from "@/lib/format";
import { parseHuntingAnalyser } from "@/lib/hunts";
import { useAppData } from "@/lib/useAppData";

export default function RegistrarHuntPage() {
  const { currentUser, data, isAdmin, removeHunt, saveHuntSession } = useAppData();
  const [title, setTitle] = useState("");
  const [character, setCharacter] = useState("");
  const [date, setDate] = useState(today());
  const [rawText, setRawText] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const parsed = useMemo(() => parseHuntingAnalyser(rawText), [rawText]);
  const visibleHunts = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return data.hunts;

    return data.hunts.filter((hunt) => hunt.userId === currentUser.id);
  }, [currentUser, data.hunts, isAdmin]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const saved = saveHuntSession({
      ...parsed,
      title,
      character,
      date,
      rawText,
      notes,
    });

    if (!saved) {
      setMessage("Entre na conta e cole o Hunting Analyser para salvar.");
      return;
    }

    setTitle("");
    setCharacter("");
    setRawText("");
    setNotes("");
    setMessage("Hunt registrada no historico.");
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Swords size={30} />
        <span className="eyebrow">Registrar Hunt</span>
        <h1>Entre para salvar suas hunts</h1>
        <p>Cada usuario ve o proprio historico. Administradores conseguem ver e remover registros.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="pageHeader">
        <span className="eyebrow">Registrar Hunt</span>
        <h1>Salvar Hunting Analyser</h1>
        <p>Cole o texto da hunt, confira os numeros principais e salve no historico do usuario.</p>
      </section>

      <section className="statGrid">
        <StatCard icon={Coins} label="XP Gain" value={formatNumber(parsed.experience)} />
        <StatCard icon={Zap} label="XP/h" value={formatNumber(parsed.experienceHour)} />
        <StatCard icon={Activity} label="Raw XP Gain" value={formatNumber(parsed.rawExperience)} />
        <StatCard icon={Gauge} label="Raw XP/h" value={formatNumber(parsed.rawExperienceHour)} />
      </section>

      <section className="pageGrid">
        <aside className="panel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Nova hunt</span>
              <h2>Dados da sessao</h2>
            </div>
            <Swords size={22} />
          </div>

          <form className="entryForm" onSubmit={submit}>
            <label>
              Nome da hunt
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Rotten Blood, Nagas, Issavi"
              />
            </label>

            <div className="fieldGrid">
              <label>
                Personagem
                <input
                  value={character}
                  onChange={(event) => setCharacter(event.target.value)}
                  placeholder="Nome do char"
                />
              </label>
              <label>
                Data
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </div>

            <label>
              Hunting Analyser
              <textarea
                className="largeTextarea"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Session: 01:20h&#10;Loot: 1,250,000&#10;Supplies: 420,000&#10;Balance: 830,000&#10;Damage: 9,800,000&#10;Healing: 1,200,000"
              />
            </label>

            <label>
              Notas
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Time, rota, imbuements, detalhe do profit..."
              />
            </label>

            <button className="submitButton" type="submit">
              <Plus size={18} />
              Salvar hunt
            </button>
          </form>

          {message ? <p className="notice">{message}</p> : null}
        </aside>

        <section className="panel">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Preview</span>
              <h2>Resumo reconhecido</h2>
            </div>
          </div>

          <div className="huntPreview">
            <div>
              <span>Tempo</span>
              <strong>{parsed.duration || "Nao informado"}</strong>
            </div>
            <div>
              <span>XP Gain</span>
              <strong>{formatNumber(parsed.experience)}</strong>
            </div>
            <div>
              <span>Raw XP Gain</span>
              <strong>{formatNumber(parsed.rawExperience)}</strong>
            </div>
            <div>
              <span>Raw XP/h</span>
              <strong>{formatNumber(parsed.rawExperienceHour)}</strong>
            </div>
          </div>

          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Historico</span>
              <h2>{visibleHunts.length} hunts salvas</h2>
            </div>
          </div>

          <div className="huntList">
            {visibleHunts.map((hunt) => (
              <article className="huntCard" key={hunt.id}>
                <div className="recordTop">
                  <div>
                    <strong>{hunt.title}</strong>
                    <p>{`${hunt.character} / ${formatDate(hunt.date)} / ${hunt.userName}`}</p>
                  </div>
                  {isAdmin ? (
                    <button type="button" className="iconButton" onClick={() => removeHunt(hunt.id)} title="Remover">
                      <Trash2 size={17} />
                    </button>
                  ) : null}
                </div>
                <div className="huntMetrics">
                  <span>Balance <strong>{formatSignedNumber(hunt.balance)}</strong></span>
                  <span>XP Gain <strong>{formatNumber(hunt.experience)}</strong></span>
                  <span>XP/h <strong>{formatNumber(hunt.experienceHour)}</strong></span>
                  <span>Raw XP Gain <strong>{formatNumber(hunt.rawExperience)}</strong></span>
                  <span>Raw XP/h <strong>{formatNumber(hunt.rawExperienceHour)}</strong></span>
                  <span>Tempo <strong>{hunt.duration || "-"}</strong></span>
                </div>
                {hunt.notes ? <p>{hunt.notes}</p> : null}
                <details className="rawDetails">
                  <summary>Texto original</summary>
                  <pre>{hunt.rawText}</pre>
                </details>
              </article>
            ))}
            {!visibleHunts.length ? <p className="mutedText">Nenhuma hunt registrada ainda.</p> : null}
          </div>
        </section>
      </section>
    </>
  );
}
