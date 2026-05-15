"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, ClipboardEvent, FormEvent, useMemo, useState } from "react";
import {
  Activity,
  Camera,
  ChevronDown,
  ChevronUp,
  Clipboard as ClipboardIcon,
  Coins,
  Filter,
  Gauge,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Swords,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { captureScreenAsFile, compressHuntImageFile, deleteHuntImages, uploadHuntImageFiles } from "@/lib/clientImages";
import { today } from "@/lib/defaults";
import { formatDate, formatNumber, formatSignedNumber } from "@/lib/format";
import { parseHuntingAnalyser } from "@/lib/hunts";
import type { HuntImage } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

const maxHuntImages = 4;

type ClipboardWithRead = Navigator["clipboard"] & {
  read?: () => Promise<ClipboardItem[]>;
};

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

export default function RegistrarHuntPage() {
  const { currentUser, data, isAdmin, removeHunt, saveHuntSession, updateHunt } = useAppData();
  const [title, setTitle] = useState("");
  const [character, setCharacter] = useState("");
  const [date, setDate] = useState(today());
  const [rawText, setRawText] = useState("");
  const [notes, setNotes] = useState("");
  const [tagText, setTagText] = useState("");
  const [images, setImages] = useState<HuntImage[]>([]);
  const [message, setMessage] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [huntQuery, setHuntQuery] = useState("");
  const [characterFilter, setCharacterFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [expandedHunts, setExpandedHunts] = useState<string[]>([]);
  const [editingHuntId, setEditingHuntId] = useState("");

  const parsed = useMemo(() => parseHuntingAnalyser(rawText), [rawText]);
  const baseHunts = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return data.hunts;

    return data.hunts.filter((hunt) => hunt.userId === currentUser.id);
  }, [currentUser, data.hunts, isAdmin]);
  const characterOptions = useMemo(() => {
    return Array.from(new Set(baseHunts.map((hunt) => hunt.character).filter(Boolean))).sort();
  }, [baseHunts]);
  const tagOptions = useMemo(() => {
    return Array.from(new Set(baseHunts.flatMap((hunt) => hunt.tags))).sort();
  }, [baseHunts]);
  const visibleHunts = useMemo(() => {
    const query = huntQuery.trim().toLowerCase();

    return baseHunts.filter((hunt) => {
      const matchesQuery =
        !query ||
        hunt.title.toLowerCase().includes(query) ||
        hunt.character.toLowerCase().includes(query) ||
        hunt.notes.toLowerCase().includes(query);
      const matchesCharacter = !characterFilter || hunt.character === characterFilter;
      const matchesTag = !tagFilter || hunt.tags.includes(tagFilter);
      const matchesDate = !dateFilter || hunt.date === dateFilter;

      return matchesQuery && matchesCharacter && matchesTag && matchesDate;
    });
  }, [baseHunts, characterFilter, dateFilter, huntQuery, tagFilter]);

  function appendHuntImages(preparedImages: HuntImage[], requestedCount: number) {
    const slots = maxHuntImages - images.length;

    if (slots <= 0) {
      setMessage(`O limite por hunt e ${maxHuntImages} imagens.`);
      return;
    }

    const acceptedImages = preparedImages.slice(0, slots);

    setImages((current) => [...current, ...acceptedImages].slice(0, maxHuntImages));
    setMessage(requestedCount > slots ? `Salvei ${slots} imagens. O limite por hunt e ${maxHuntImages}.` : "");
  }

  async function addImageFiles(files: File[], emptyMessage: string) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const slots = maxHuntImages - images.length;

    if (!imageFiles.length) {
      setMessage(emptyMessage);
      return;
    }

    if (slots <= 0) {
      setMessage(`O limite por hunt e ${maxHuntImages} imagens.`);
      return;
    }

    setIsUploadingImage(true);

    try {
      const preparedFiles = await Promise.all(imageFiles.slice(0, slots).map(compressHuntImageFile));
      const uploadedImages = await uploadHuntImageFiles(preparedFiles);
      appendHuntImages(uploadedImages, imageFiles.length);
    } catch {
      setMessage("Nao foi possivel enviar uma das imagens.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  function addImages(event: ChangeEvent<HTMLInputElement>) {
    void addImageFiles(Array.from(event.target.files ?? []), "Nenhuma imagem reconhecida.");
    event.target.value = "";
  }

  async function pastePrintFromClipboard() {
    const clipboard = navigator.clipboard as ClipboardWithRead | undefined;

    if (!clipboard?.read) {
      setMessage("Cole o print direto na area de imagens.");
      return;
    }

    try {
      const items = await clipboard.read();
      const files: File[] = [];

      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));

        if (!imageType) continue;

        const blob = await item.getType(imageType);
        files.push(new File([blob], "print-colado.png", { type: imageType }));
      }

      await addImageFiles(files, "Nenhum print encontrado na area de transferencia.");
    } catch {
      setMessage("Nao consegui ler a area de transferencia. Use Ctrl+V na area de imagens.");
    }
  }

  function pastePrint(event: ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));

    if (!files.length) return;

    event.preventDefault();
    void addImageFiles(files, "Nenhum print encontrado na area de transferencia.");
  }

  async function captureScreenPrint() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMessage("Captura de tela indisponivel neste navegador.");
      return;
    }

    if (images.length >= maxHuntImages) {
      setMessage(`O limite por hunt e ${maxHuntImages} imagens.`);
      return;
    }

    setIsCapturing(true);

    try {
      const file = await captureScreenAsFile();
      await addImageFiles([file], "Nao foi possivel capturar o print.");
    } catch {
      setMessage("Captura cancelada ou indisponivel.");
    } finally {
      setIsCapturing(false);
    }
  }

  function removeImage(id: string) {
    const image = images.find((entry) => entry.id === id);

    if (image) {
      void deleteHuntImages([image]);
    }

    setImages((current) => current.filter((image) => image.id !== id));
  }

  function toggleHunt(id: string) {
    setExpandedHunts((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  function clearFilters() {
    setHuntQuery("");
    setCharacterFilter("");
    setTagFilter("");
    setDateFilter("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const saved = saveHuntSession({
      ...parsed,
      title,
      character,
      date,
      rawText,
      notes,
      images,
      tags: parseTags(tagText),
    });

    if (!saved) {
      setMessage("Entre na conta e cole o Hunting Analyser para salvar.");
      return;
    }

    setTitle("");
    setCharacter("");
    setRawText("");
    setNotes("");
    setTagText("");
    setImages([]);
    setMessage("Hunt registrada no historico.");
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
      tags: parseTags(String(formData.get("tags") ?? "")),
    });
    setEditingHuntId("");
    setMessage("Hunt atualizada.");
  }

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Swords size={30} />
        <span className="eyebrow">Registrar Hunt</span>
        <h1>Entre para salvar suas hunts</h1>
        <p>Cada usuario ve o proprio historico e consegue ajustar as proprias hunts.</p>
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

            <label>
              Tags
              <input
                value={tagText}
                onChange={(event) => setTagText(event.target.value)}
                placeholder="Ex: solo, duo, profit, library"
              />
            </label>

            <div className="imageUploader" onPaste={pastePrint} tabIndex={0}>
              <div className="imageTools">
                <label className="imageInputButton">
                  <ImagePlus size={18} />
                  Imagem salva
                  <input type="file" accept="image/*" multiple onChange={addImages} />
                </label>
                <button className="imageInputButton" type="button" onClick={pastePrintFromClipboard}>
                  <ClipboardIcon size={18} />
                  Colar print
                </button>
                <button className="imageInputButton" type="button" onClick={captureScreenPrint} disabled={isCapturing}>
                  <Camera size={18} />
                  {isCapturing ? "Capturando" : "Capturar tela"}
                </button>
              </div>
              <span className="imageCounter">
                {isUploadingImage ? "Enviando..." : `${images.length}/${maxHuntImages} imagens`}
              </span>
            </div>

            {images.length ? (
              <div className="imageGrid">
                {images.map((image) => (
                  <figure className="imageThumb" key={image.id}>
                    <Image src={image.src} alt={image.name} width={320} height={180} unoptimized />
                    <button type="button" onClick={() => removeImage(image.id)} title="Remover imagem">
                      <X size={15} />
                    </button>
                  </figure>
                ))}
              </div>
            ) : null}

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
              <h2>{visibleHunts.length} hunts encontradas</h2>
            </div>
            <Filter size={20} />
          </div>

          <div className="huntFilters">
            <input
              value={huntQuery}
              onChange={(event) => setHuntQuery(event.target.value)}
              placeholder="Buscar hunt, char ou nota"
            />
            <select value={characterFilter} onChange={(event) => setCharacterFilter(event.target.value)}>
              <option value="">Todos os chars</option>
              {characterOptions.map((character) => (
                <option value={character} key={character}>
                  {character}
                </option>
              ))}
            </select>
            <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
              <option value="">Todas as tags</option>
              {tagOptions.map((tag) => (
                <option value={tag} key={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            <button type="button" className="secondaryButton" onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>

          <div className="huntList">
            {visibleHunts.map((hunt) => (
              <article className="huntCard" key={hunt.id}>
                {(() => {
                  const expanded = expandedHunts.includes(hunt.id);
                  const editing = editingHuntId === hunt.id;
                  const canEdit = Boolean(currentUser && (isAdmin || hunt.userId === currentUser.id));

                  return (
                    <>
                      <div className="recordTop">
                        <div>
                          <strong>{hunt.title}</strong>
                          <p>{`${hunt.character} / ${formatDate(hunt.date)} / ${hunt.userName}`}</p>
                        </div>
                        <div className="rowActions">
                          <button type="button" title={expanded ? "Recolher" : "Expandir"} onClick={() => toggleHunt(hunt.id)}>
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHuntId(editing ? "" : hunt.id);

                                if (!expanded) {
                                  toggleHunt(hunt.id);
                                }
                              }}
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                          ) : null}
                          {canEdit ? (
                            <button type="button" onClick={() => removeHunt(hunt.id)} title="Remover">
                              <Trash2 size={17} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {hunt.tags.length ? (
                        <div className="tagList">
                          {hunt.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                      <div className="huntMetrics">
                        <span>Balance <strong>{formatSignedNumber(hunt.balance)}</strong></span>
                        <span>XP Gain <strong>{formatNumber(hunt.experience)}</strong></span>
                        <span>XP/h <strong>{formatNumber(hunt.experienceHour)}</strong></span>
                        <span>Raw XP Gain <strong>{formatNumber(hunt.rawExperience)}</strong></span>
                        <span>Raw XP/h <strong>{formatNumber(hunt.rawExperienceHour)}</strong></span>
                        <span>Tempo <strong>{hunt.duration || "-"}</strong></span>
                      </div>
                      {expanded ? (
                        editing ? (
                          <form className="inlineHuntForm" onSubmit={(event) => submitHuntEdit(event, hunt.id)}>
                            <div className="fieldGrid">
                              <label>
                                Nome da hunt
                                <input name="title" defaultValue={hunt.title} />
                              </label>
                              <label>
                                Personagem
                                <input name="character" defaultValue={hunt.character} />
                              </label>
                            </div>
                            <div className="fieldGrid">
                              <label>
                                Data
                                <input name="date" type="date" defaultValue={hunt.date} />
                              </label>
                              <label>
                                Tags
                                <input name="tags" defaultValue={hunt.tags.join(", ")} />
                              </label>
                            </div>
                            <label>
                              Notas
                              <textarea name="notes" defaultValue={hunt.notes} />
                            </label>
                            <label>
                              Hunting Analyser
                              <textarea name="rawText" className="largeTextarea" defaultValue={hunt.rawText} />
                            </label>
                            <div className="inlineHuntActions">
                              <button type="button" className="secondaryButton" onClick={() => setEditingHuntId("")}>
                                Cancelar
                              </button>
                              <button type="submit" className="submitButton">
                                <Save size={18} />
                                Salvar alteracoes
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            {hunt.images?.length ? (
                              <div className="imageGrid savedImages">
                                {hunt.images.map((image) => (
                                  <figure className="imageThumb" key={image.id}>
                                    <Image src={image.src} alt={image.name} width={320} height={180} unoptimized />
                                  </figure>
                                ))}
                              </div>
                            ) : null}
                            {hunt.notes ? <p>{hunt.notes}</p> : null}
                            <details className="rawDetails">
                              <summary>Texto original</summary>
                              <pre>{hunt.rawText}</pre>
                            </details>
                          </>
                        )
                      ) : null}
                    </>
                  );
                })()}
              </article>
            ))}
            {!visibleHunts.length ? <p className="mutedText">Nenhuma hunt encontrada com esses filtros.</p> : null}
          </div>
        </section>
      </section>
    </>
  );
}
