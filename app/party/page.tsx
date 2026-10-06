"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clipboard, Coins, Shield, Users } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { formatNumber, formatSignedNumber } from "@/lib/format";
import { computePartySplit, parsePartyHunt } from "@/lib/partySplit";
import { useAppData } from "@/lib/useAppData";

const exampleText = `Session data: From 2026-10-01, 20:00:00 to 2026-10-01, 21:30:00
Session: 01:30h
Loot Type: Leader
Loot: 1,000,000
Supplies: 280,000
Balance: 720,000
Eligos (Leader)
    Loot: 1,000,000
    Supplies: 100,000
    Balance: 900,000
Malvadinho
    Loot: 0
    Supplies: 90,000
    Balance: -90,000
Durg Tyre
    Loot: 0
    Supplies: 90,000
    Balance: -90,000`;

export default function PartyPage() {
  const { currentUser, hasLoaded } = useAppData();
  const [rawText, setRawText] = useState("");
  const [copied, setCopied] = useState("");

  const session = useMemo(() => parsePartyHunt(rawText), [rawText]);
  const split = useMemo(() => (session ? computePartySplit(session.members) : null), [session]);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? "" : current)), 1600);
    } catch {
      setCopied("");
    }
  }

  if (!hasLoaded) {
    return (
      <section className="loginPrompt">
        <span className="eyebrow">Party</span>
        <h1>Carregando</h1>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Party</span>
        <h1>Entre para dividir o loot</h1>
        <p>Cole o Party Hunt Analyser e veja quem paga a quem.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="pageHeader">
        <span className="eyebrow">Party hunt</span>
        <h1>Divisor de party</h1>
        <p>Cole o texto do Party Hunt Analyser. O balance total e dividido em partes iguais e o painel mostra as transferencias minimas, com o comando pronto para o banco.</p>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Entrada</span>
            <h2>Party Hunt Analyser</h2>
          </div>
          <Users size={22} />
        </div>
        <textarea
          className="partyInput"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Cole aqui o texto copiado do Party Hunt Analyser (com a lista de jogadores)"
          rows={8}
          aria-label="Texto do Party Hunt Analyser"
        />
        <div className="partyActions">
          <button type="button" className="secondaryButton" onClick={() => setRawText(exampleText)}>
            Usar exemplo
          </button>
          {rawText ? (
            <button type="button" className="secondaryButton" onClick={() => setRawText("")}>
              Limpar
            </button>
          ) : null}
        </div>
        {rawText.trim() && !session ? (
          <p className="errorNotice">Nao encontrei pelo menos 2 jogadores. Copie o texto completo do Party Hunt Analyser, incluindo os nomes de cada membro.</p>
        ) : null}
      </section>

      {session && split ? (
        <>
          <section className="statGrid">
            <StatCard icon={Coins} label="Loot total" value={formatNumber(session.totalLoot)} />
            <StatCard icon={Coins} label="Supplies" value={formatNumber(session.totalSupplies)} />
            <StatCard icon={Coins} label="Balance" value={formatSignedNumber(session.totalBalance)} />
            <StatCard icon={Users} label="Parte por jogador" value={formatSignedNumber(split.rows[0]?.target ?? 0)} />
          </section>

          <section className="pageGrid partyGrid">
            <section className="panel">
              <div className="sectionTitle">
                <div>
                  <span className="eyebrow">Pagamentos</span>
                  <h2>Transferencias</h2>
                </div>
              </div>
              <div className="transferList">
                {split.transfers.map((transfer) => {
                  const key = `${transfer.from}>${transfer.to}`;

                  return (
                    <div className="transferRow" key={key}>
                      <div>
                        <strong>{transfer.from}</strong>
                        <span>{`paga ${formatNumber(transfer.amount)} gp para ${transfer.to}`}</span>
                        <code>{transfer.command}</code>
                      </div>
                      <button type="button" className="lootIconButton" onClick={() => copy(key, transfer.command)} title="Copiar comando do banco" aria-label={`Copiar comando: ${transfer.command}`}>
                        {copied === key ? <Check size={16} /> : <Clipboard size={16} />}
                      </button>
                    </div>
                  );
                })}
                {!split.transfers.length ? <p className="mutedText">Ninguem precisa pagar: os balances ja estao iguais.</p> : null}
              </div>
            </section>

            <section className="panel">
              <div className="sectionTitle">
                <div>
                  <span className="eyebrow">Por jogador</span>
                  <h2>Resultado</h2>
                </div>
              </div>
              <div className="partyTable">
                <div className="partyTableHead">
                  <span>Jogador</span>
                  <span>Balance</span>
                  <span>Fica com</span>
                  <span>Acerto</span>
                </div>
                {split.rows.map((row) => (
                  <div className="partyTableRow" key={row.name}>
                    <strong>{row.name}</strong>
                    <span>{formatSignedNumber(row.balance)}</span>
                    <span>{formatSignedNumber(row.target)}</span>
                    <em className={row.diff > 0 ? "pays" : row.diff < 0 ? "gets" : ""}>{row.diff === 0 ? "-" : row.diff > 0 ? `paga ${formatNumber(row.diff)}` : `recebe ${formatNumber(-row.diff)}`}</em>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </>
      ) : null}
    </>
  );
}
