"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Shield } from "lucide-react";
import { useAppData } from "@/lib/useAppData";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login } = useAppData();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = login(username, password);

    if (!ok) {
      setMessage("Usuario ou senha incorretos.");
      return;
    }

    router.push("/");
  }

  return (
    <section className="authShell">
      <div className="authPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Acesso</span>
            <h1>Entrar no ClosedBoss</h1>
          </div>
          <Shield size={24} />
        </div>

        <form className="entryForm" onSubmit={submit}>
          <label>
            Usuario
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
            />
          </label>

          <label>
            Senha
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin123"
            />
          </label>

          <button className="submitButton" type="submit">
            <LogIn size={18} />
            Entrar
          </button>
        </form>

        <div className="credentialsBox">
          <strong>Primeiro acesso</strong>
          <span>Admin: admin / admin123</span>
          <span>Usuario: player / player123</span>
        </div>

        {message ? <p className="errorNotice">{message}</p> : null}
      </div>
    </section>
  );
}
