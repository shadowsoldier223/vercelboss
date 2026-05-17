"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  Crown,
  Download,
  FileUp,
  History,
  ImagePlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Swords,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { compressHuntImageFile, deleteHuntImages, uploadHuntImageFiles } from "@/lib/clientImages";
import { today } from "@/lib/defaults";
import { formatDate, formatNumber, formatSignedNumber, formatTime } from "@/lib/format";
import type { HuntImage, LootBoss, UserRole } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

type AdminTab = "atividades" | "bosses" | "duos" | "hunts" | "usuarios" | "backup" | "logs";

const tabs: { key: AdminTab; label: string }[] = [
  { key: "atividades", label: "Atividades" },
  { key: "bosses", label: "Bosses" },
  { key: "duos", label: "Duos" },
  { key: "hunts", label: "Hunts" },
  { key: "usuarios", label: "Usuarios" },
  { key: "backup", label: "Backup" },
  { key: "logs", label: "Logs" },
];

export default function AdminPage() {
  const {
    addDuo,
    addLootBoss,
    addUser,
    currentUser,
    data,
    isAdmin,
    removeDuo,
    removeFeat,
    removeHunt,
    removeLootBoss,
    removeUser,
    resetDuo,
    updateDuo,
    updateFeat,
    updateHunt,
    updateLootBoss,
    updateUser,
  } = useAppData();
  const [tab, setTab] = useState<AdminTab>("atividades");
  const [bossTitle, setBossTitle] = useState("");
  const [bossMode, setBossMode] = useState<LootBoss["mode"]>("solo");
  const [duoLeft, setDuoLeft] = useState("");
  const [duoRight, setDuoRight] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [message, setMessage] = useState("");
  const [imageUploadHuntId, setImageUploadHuntId] = useState("");
  const [logQuery, setLogQuery] = useState("");
  const [logActor, setLogActor] = useState("");
  const [logTarget, setLogTarget] = useState("");
  const logActors = useMemo(() => {
    return Array.from(new Set(data.activityLogs.map((log) => log.actorName).filter(Boolean))).sort();
  }, [data.activityLogs]);
  const logTargets = useMemo(() => {
    return Array.from(new Set(data.activityLogs.map((log) => log.target).filter(Boolean))).sort();
  }, [data.activityLogs]);
  const filteredLogs = useMemo(() => {
    const query = logQuery.trim().toLowerCase();

    return data.activityLogs.filter((log) => {
      const metadata = log.metadata?.flatMap((entry) => [entry.label, entry.value]) ?? [];
      const changes = log.changes?.flatMap((entry) => [entry.field, entry.before, entry.after]) ?? [];
      const haystack = [
        log.actorName,
        log.action,
        log.target,
        log.details,
        log.targetId ?? "",
        log.createdAt,
        ...metadata,
        ...changes,
      ]
        .join(" ")
        .toLowerCase();

      return (!query || haystack.includes(query)) && (!logActor || log.actorName === logActor) && (!logTarget || log.target === logTarget);
    });
  }, [data.activityLogs, logActor, logQuery, logTarget]);
  const todaysLogs = useMemo(() => {
    const now = new Date();

    return data.activityLogs.filter((log) => {
      const date = new Date(log.createdAt);

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }).length;
  }, [data.activityLogs]);
  const lastLog = data.activityLogs[0];

  function submitBoss(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = addLootBoss({ label: bossTitle, mode: bossMode });

    if (!created) {
      setMessage("Nao foi possivel criar esse boss.");
      return;
    }

    setBossTitle("");
    setBossMode("solo");
    setMessage("Boss criado e disponivel na aba Loot.");
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
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setMessage("Hunt atualizada.");
  }

  async function addHuntImages(event: ChangeEvent<HTMLInputElement>, huntId: string, currentImages: HuntImage[]) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));

    event.target.value = "";

    if (!files.length) return;

    setImageUploadHuntId(huntId);

    try {
      const preparedFiles = await Promise.all(files.slice(0, 4).map(compressHuntImageFile));
      const uploadedImages = await uploadHuntImageFiles(preparedFiles);

      updateHunt(huntId, { images: [...currentImages, ...uploadedImages].slice(0, 8) });
      setMessage("Imagens da hunt atualizadas.");
    } catch {
      setMessage("Nao foi possivel enviar as imagens.");
    } finally {
      setImageUploadHuntId("");
    }
  }

  function removeHuntImage(huntId: string, currentImages: HuntImage[], image: HuntImage) {
    void deleteHuntImages([image]);
    updateHunt(huntId, { images: currentImages.filter((entry) => entry.id !== image.id) });
    setMessage("Imagem removida da hunt.");
  }

  async function exportBackup() {
    const response = await fetch("/api/backup", { cache: "no-store" }).catch(() => null);

    if (!response?.ok) {
      setMessage("Nao foi possivel baixar o backup.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `closedboss-backup-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Backup baixado.");
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    try {
      const text = await file.text();
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });

      if (!response.ok) {
        setMessage("Nao foi possivel restaurar esse arquivo.");
        return;
      }

      setMessage("Backup restaurado. Recarregando o painel...");
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      setMessage("Arquivo de backup invalido.");
    }
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
        <p>Use as abas para alterar atividades, bosses, duos, hunts e usuarios.</p>
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

        {tab === "atividades" ? (
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
                Tipo
                <select value={bossMode} onChange={(event) => setBossMode(event.target.value as LootBoss["mode"])}>
                  <option value="solo">Solo</option>
                  <option value="duo">Duo</option>
                </select>
              </label>
              <button className="submitButton" type="submit">
                <Plus size={18} />
                Criar boss
              </button>
            </form>

            <div className="adminList">
              {data.lootBosses.map((boss) => (
                <article className="adminRow compactAdminRow" key={boss.key}>
                  <div className="adminRowTitle">
                    <Crown size={17} />
                    <strong>{boss.label}</strong>
                  </div>
                  <input defaultValue={boss.label} onBlur={(event) => updateLootBoss(boss.key, { label: event.target.value })} />
                  <select value={boss.mode} onChange={(event) => updateLootBoss(boss.key, { mode: event.target.value as LootBoss["mode"] })}>
                    <option value="solo">Solo</option>
                    <option value="duo">Duo</option>
                  </select>
                  <button type="button" className="secondaryButton" onClick={() => removeLootBoss(boss.key)}>
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

                  {hunt.images.length ? (
                    <div className="imageGrid savedImages">
                      {hunt.images.map((image) => (
                        <figure className="imageThumb" key={image.id}>
                          <Image src={image.src} alt={image.name} width={320} height={180} unoptimized />
                          <button
                            type="button"
                            onClick={() => removeHuntImage(hunt.id, hunt.images, image)}
                            title="Remover imagem"
                          >
                            <X size={15} />
                          </button>
                        </figure>
                      ))}
                    </div>
                  ) : null}

                  <div className="imageUploader">
                    <label className="imageInputButton">
                      <ImagePlus size={18} />
                      {imageUploadHuntId === hunt.id ? "Enviando" : "Adicionar prints"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => addHuntImages(event, hunt.id, hunt.images)}
                      />
                    </label>
                  </div>

                  <label>
                    Tags
                    <input name="tags" defaultValue={hunt.tags.join(", ")} placeholder="solo, profit, library" />
                  </label>

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
                  type="password"
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
                    type="password"
                    defaultValue=""
                    placeholder="Nova senha"
                    onBlur={(event) => {
                      if (event.target.value.trim()) {
                        updateUser(user.id, { password: event.target.value });
                        event.target.value = "";
                      }
                    }}
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

        {tab === "backup" ? (
          <div className="backupGrid">
            <article className="backupCard">
              <div className="adminRowTitle">
                <Download size={18} />
                <strong>Exportar dados</strong>
              </div>
              <p className="mutedText">Baixa um arquivo com usuarios, hunts, bosses, duos, loots, imagens e logs.</p>
              <button type="button" className="submitButton" onClick={exportBackup}>
                <Download size={18} />
                Baixar backup
              </button>
            </article>

            <article className="backupCard dangerBackupCard">
              <div className="adminRowTitle">
                <FileUp size={18} />
                <strong>Restaurar backup</strong>
              </div>
              <p className="mutedText">Substitui os dados atuais pelo arquivo selecionado. Use apenas backups confiaveis.</p>
              <label className="imageInputButton restoreInput">
                <FileUp size={18} />
                Escolher arquivo
                <input type="file" accept="application/json,.json" onChange={restoreBackup} />
              </label>
            </article>
          </div>
        ) : null}

        {tab === "logs" ? (
          <div className="adminStack">
            <div className="adminRowTitle">
              <History size={18} />
              <strong>Historico detalhado</strong>
            </div>

            <div className="logSummaryGrid">
              <article>
                <span>Total</span>
                <strong>{data.activityLogs.length}</strong>
              </article>
              <article>
                <span>Hoje</span>
                <strong>{todaysLogs}</strong>
              </article>
              <article>
                <span>Usuarios</span>
                <strong>{logActors.length}</strong>
              </article>
              <article>
                <span>Ultimo</span>
                <strong>{lastLog ? formatTime(lastLog.createdAt) : "-"}</strong>
              </article>
            </div>

            <div className="logFilters">
              <div className="searchBox">
                <Search size={17} />
                <input value={logQuery} onChange={(event) => setLogQuery(event.target.value)} placeholder="Buscar usuario, alvo, item ou alteracao" />
              </div>
              <select value={logActor} onChange={(event) => setLogActor(event.target.value)}>
                <option value="">Todos os usuarios</option>
                {logActors.map((actor) => (
                  <option value={actor} key={actor}>
                    {actor}
                  </option>
                ))}
              </select>
              <select value={logTarget} onChange={(event) => setLogTarget(event.target.value)}>
                <option value="">Todos os tipos</option>
                {logTargets.map((target) => (
                  <option value={target} key={target}>
                    {target}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="secondaryButton"
                onClick={() => {
                  setLogQuery("");
                  setLogActor("");
                  setLogTarget("");
                }}
              >
                Limpar
              </button>
            </div>

            <div className="logList">
              {filteredLogs.map((log) => (
                <article className="logRow detailedLogRow" key={log.id}>
                  <div className="logHead">
                    <div>
                      <strong>{log.actorName}</strong>
                      <span>{`${log.action} ${log.target}`}</span>
                    </div>
                    <em>{`${formatDate(log.createdAt)} as ${formatTime(log.createdAt)}`}</em>
                  </div>
                  <p>{log.details}</p>

                  {log.metadata?.length ? (
                    <div className="logMetaGrid">
                      {log.metadata.map((entry) => (
                        <span key={`${log.id}-${entry.label}`}>
                          {entry.label}
                          <strong>{entry.value}</strong>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {log.changes?.length ? (
                    <div className="changeList">
                      {log.changes.map((entry) => (
                        <div className="changeRow" key={`${log.id}-${entry.field}`}>
                          <strong>{entry.field}</strong>
                          <span>{entry.before}</span>
                          <em>{entry.after}</em>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="logFooter">
                    <span>{log.targetId ? `Alvo: ${log.targetId}` : "Alvo sem ID antigo"}</span>
                    <code>{log.id}</code>
                  </div>
                </article>
              ))}
              {!filteredLogs.length ? <p className="mutedText">Nenhum log encontrado com esses filtros.</p> : null}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
