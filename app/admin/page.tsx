"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Crown, Plus, RotateCcw, Save, Shield, Swords, Trash2, UserCog, Users } from "lucide-react";
import { today } from "@/lib/defaults";
import { formatDate, formatNumber, formatSignedNumber } from "@/lib/format";
import type { UserRole } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

type AdminTab = "registros" | "bosses" | "duos" | "hunts" | "usuarios";

const tabs: { key: AdminTab; label: string }[] = [
  { key: "registros", label: "Registros" },
  { key: "bosses", label: "Bosses" },
  { key: "duos", label: "Duos" },
  { key: "hunts", label: "Hunts" },
  { key: "usuarios", label: "Usuarios" },
];

export default function AdminPage() {
  const {
    addDuo,
    addFeat,
    addUser,
    currentUser,
    data,
    isAdmin,
    removeDuo,
    removeFeat,
    removeHunt,
    removeUser,
    resetDuo,
    updateDuo,
    updateFeat,
    updateHunt,
    updateUser,
  } = useAppData();
  const [tab, setTab] = useState<AdminTab>("registros");
  const [bossTitle, setBossTitle] = useState("");
  const [bossCharacter, setBossCharacter] = useState("");
  const [duoLeft, setDuoLeft] = useState("");
  const [duoRight, setDuoRight] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [message, setMessage] = useState("");

  const bosses = useMemo(() => data.feats.filter((feat) => feat.type === "Boss"), [data.feats]);

  function submitBoss(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bossTitle.trim()) return;

    addFeat({
      type: "Boss",
      title: bossTitle,
      character: bossCharacter,
      world: "",
      date: today(),
      place: "",
      loot: "",
      notes: "",
      difficulty: 3,
    });
    setBossTitle("");
    setBossCharacter("");
    setMessage("Boss adicionado.");
  }

  function submitDuo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addDuo(duoLeft, duoRight);
    setDuoLeft("");
    setDuoRight("");
    setMessage("Duo adicionado.");
  }

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = addUser({ username: newUsername, password: newPassword, role: newRole });

    if (!created) {
      setMessage("Nao foi possivel criar o usuario.");
      return;
    }

    setNewUsername("");
    setNewPassword("");
    setNewRole("user");
    setMessage("Usuario criado.");
  }

  function submitHuntEdit(event: FormEvent<HTMLFormElement>, huntId: string) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    updateHunt(huntId, {
      title: String(formData.get("title") ?? ""),
      character: String(formData.get("character") ?? ""),
      date: String(formData.get("date") ?? today()),
      notes: String(formData.get("notes") ?? ""),
      rawText: String(formData.get("rawText") ?? ""),
    });
    setMessage("Hunt atualizada.");
  }

  if (!currentUser || !isAdmin) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Admin</span>
        <h1>Acesso de administrador</h1>
        <p>Entre com uma conta admin para editar registros, bosses, duos e usuarios.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="pageHeader">
        <span className="eyebrow">Admin</span>
        <h1>Controle do site</h1>
        <p>Use as abas para alterar registros, bosses, duos, hunts e usuarios.</p>
      </section>

      <section className="panel adminPanel">
        <div className="adminTabs">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "active" : ""}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {message ? <p className="notice">{message}</p> : null}

        {tab === "registros" ? (
          <div className="adminList">
            {data.feats.map((feat) => (
              <article className="adminRow" key={feat.id}>
                <div className="adminRowTitle">
                  <Save size={17} />
                  <strong>{feat.type}</strong>
                </div>
                <input defaultValue={feat.title} onBlur={(event) => updateFeat(feat.id, { title: event.target.value })} />
                <input
                  defaultValue={feat.character}
                  onBlur={(event) => updateFeat(feat.id, { character: event.target.value })}
                />
                <input defaultValue={feat.loot} onBlur={(event) => updateFeat(feat.id, { loot: event.target.value })} />
                <textarea
                  defaultValue={feat.notes}
                  onBlur={(event) => updateFeat(feat.id, { notes: event.target.value })}
                />
                <button type="button" className="secondaryButton" onClick={() => removeFeat(feat.id)}>
                  <Trash2 size={16} />
                  Remover
                </button>
              </article>
            ))}
          </div>
        ) : null}

        {tab === "bosses" ? (
          <div className="adminStack">
            <form className="adminInlineForm" onSubmit={submitBoss}>
              <label>
                Boss
                <input value={bossTitle} onChange={(event) => setBossTitle(event.target.value)} placeholder="Nome do boss" />
              </label>
              <label>
                Personagem
                <input
                  value={bossCharacter}
                  onChange={(event) => setBossCharacter(event.target.value)}
                  placeholder="Quem matou"
                />
              </label>
              <button className="submitButton" type="submit">
                <Plus size={18} />
                Adicionar boss
              </button>
            </form>

            <div className="adminList">
              {bosses.map((boss) => (
                <article className="adminRow" key={boss.id}>
                  <div className="adminRowTitle">
                    <Crown size={17} />
                    <strong>{boss.title}</strong>
                  </div>
                  <input defaultValue={boss.title} onBlur={(event) => updateFeat(boss.id, { title: event.target.value })} />
                  <input
                    defaultValue={boss.character}
                    onBlur={(event) => updateFeat(boss.id, { character: event.target.value })}
                  />
                  <input defaultValue={boss.loot} onBlur={(event) => updateFeat(boss.id, { loot: event.target.value })} />
                  <button type="button" className="secondaryButton" onClick={() => removeFeat(boss.id)}>
                    <Trash2 size={16} />
                    Remover
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "duos" ? (
          <div className="adminStack">
            <form className="adminInlineForm" onSubmit={submitDuo}>
              <label>
                Jogador 1
                <input value={duoLeft} onChange={(event) => setDuoLeft(event.target.value)} placeholder="Eligos" />
              </label>
              <label>
                Jogador 2
                <input value={duoRight} onChange={(event) => setDuoRight(event.target.value)} placeholder="Malvadinho" />
              </label>
              <button className="submitButton" type="submit">
                <Plus size={18} />
                Adicionar duo
              </button>
            </form>

            <div className="adminList">
              {data.duos.map((duo) => (
                <article className="adminRow compactAdminRow" key={duo.id}>
                  <div className="adminRowTitle">
                    <Users size={17} />
                    <strong>{duo.left} + {duo.right}</strong>
                  </div>
                  <input defaultValue={duo.left} onBlur={(event) => updateDuo(duo.id, { left: event.target.value })} />
                  <input defaultValue={duo.right} onBlur={(event) => updateDuo(duo.id, { right: event.target.value })} />
                  <button type="button" className="secondaryButton" onClick={() => resetDuo(duo.id)}>
                    <RotateCcw size={16} />
                    Resetar
                  </button>
                  <button type="button" className="secondaryButton" onClick={() => removeDuo(duo.id)}>
                    <Trash2 size={16} />
                    Remover
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "hunts" ? (
          <div className="adminHuntList">
            {data.hunts.map((hunt) => (
              <article className="adminHuntCard" key={hunt.id}>
                <form className="adminHuntForm" onSubmit={(event) => submitHuntEdit(event, hunt.id)}>
                  <div className="recordTop">
                    <div className="adminRowTitle">
                      <Swords size={17} />
                      <strong>{hunt.title}</strong>
                    </div>
                    <button type="button" className="iconButton" onClick={() => removeHunt(hunt.id)} title="Remover">
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="adminHuntFields">
                    <label>
                      Nome da hunt
                      <input name="title" defaultValue={hunt.title} />
                    </label>
                    <label>
                      Personagem
                      <input name="character" defaultValue={hunt.character} />
                    </label>
                    <label>
                      Data
                      <input name="date" type="date" defaultValue={hunt.date} />
                    </label>
                  </div>

                  <div className="huntMetrics">
                    <span>Usuario <strong>{hunt.userName}</strong></span>
                    <span>Balance <strong>{formatSignedNumber(hunt.balance)}</strong></span>
                    <span>XP Gain <strong>{formatNumber(hunt.experience)}</strong></span>
                    <span>XP/h <strong>{formatNumber(hunt.experienceHour)}</strong></span>
                    <span>Raw XP Gain <strong>{formatNumber(hunt.rawExperience)}</strong></span>
                    <span>Raw XP/h <strong>{formatNumber(hunt.rawExperienceHour)}</strong></span>
                    <span>Tempo <strong>{hunt.duration || "-"}</strong></span>
                  </div>

                  <label>
                    Notas
                    <textarea name="notes" defaultValue={hunt.notes} />
                  </label>

                  <details className="rawDetails">
                    <summary>Editar Hunting Analyser original</summary>
                    <textarea name="rawText" className="largeTextarea" defaultValue={hunt.rawText} />
                  </details>

                  <div className="adminHuntActions">
                    <p className="mutedText">{`Criada em ${formatDate(hunt.createdAt)}`}</p>
                    <button type="submit" className="submitButton">
                      <Save size={18} />
                      Salvar alteracoes
                    </button>
                  </div>
                </form>
              </article>
            ))}
            {!data.hunts.length ? <p className="mutedText">Ainda nao tem hunts salvas.</p> : null}
          </div>
        ) : null}

        {tab === "usuarios" ? (
          <div className="adminStack">
            <form className="adminInlineForm" onSubmit={submitUser}>
              <label>
                Usuario
                <input
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  placeholder="Nome de login"
                />
              </label>
              <label>
                Senha
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Senha inicial"
                />
              </label>
              <label>
                Permissao
                <select value={newRole} onChange={(event) => setNewRole(event.target.value as UserRole)}>
                  <option value="user">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button className="submitButton" type="submit">
                <UserCog size={18} />
                Criar usuario
              </button>
            </form>

            <div className="adminList">
              {data.users.map((user) => (
                <article className="adminRow compactAdminRow" key={user.id}>
                  <div className="adminRowTitle">
                    <UserCog size={17} />
                    <strong>{user.username}</strong>
                  </div>
                  <input
                    defaultValue={user.password}
                    onBlur={(event) => updateUser(user.id, { password: event.target.value })}
                  />
                  <select
                    defaultValue={user.role}
                    onChange={(event) => updateUser(user.id, { role: event.target.value as UserRole })}
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="button" className="secondaryButton" onClick={() => removeUser(user.id)}>
                    <Trash2 size={16} />
                    Remover
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
