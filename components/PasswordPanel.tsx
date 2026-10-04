"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAppData } from "@/lib/useAppData";

export function PasswordPanel() {
  const { changePassword } = useAppData();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (next !== confirm) {
      setMessage({ tone: "error", text: "A confirmacao nao confere com a nova senha." });
      return;
    }

    setBusy(true);
    const result = await changePassword(current, next);
    setBusy(false);

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error ?? "Nao foi possivel alterar a senha." });
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage({ tone: "ok", text: "Senha alterada." });
  }

  return (
    <section className="panel sectionBlock">
      <div className="sectionTitle">
        <div>
          <span className="eyebrow">Seguranca</span>
          <h2>Alterar senha</h2>
        </div>
        <KeyRound size={22} />
      </div>

      <form className="entryForm" onSubmit={submit}>
        <label>
          Senha atual
          <input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required />
        </label>
        <div className="fieldGrid">
          <label>
            Nova senha
            <input type="password" autoComplete="new-password" minLength={6} value={next} onChange={(event) => setNext(event.target.value)} required />
          </label>
          <label>
            Confirmar nova senha
            <input type="password" autoComplete="new-password" minLength={6} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
          </label>
        </div>
        <button className="submitButton" type="submit" disabled={busy}>
          <KeyRound size={18} />
          {busy ? "Salvando" : "Salvar nova senha"}
        </button>
      </form>

      {message ? <p className={message.tone === "ok" ? "notice" : "errorNotice"}>{message.text}</p> : null}
    </section>
  );
}
