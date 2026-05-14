"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, ClipboardEvent, FormEvent, useMemo, useState } from "react";
import { Activity, Camera, Clipboard as ClipboardIcon, Coins, Gauge, ImagePlus, Plus, Swords, Trash2, X, Zap } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { today } from "@/lib/defaults";
import { formatDate, formatNumber, formatSignedNumber } from "@/lib/format";
import { parseHuntingAnalyser } from "@/lib/hunts";
import type { HuntImage } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

const maxHuntImages = 4;
const maxImageSize = 1200;
const imageQuality = 0.78;

type ClipboardWithRead = Navigator["clipboard"] & {
  read?: () => Promise<ClipboardItem[]>;
};

function makeImageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `hunt-image-${crypto.randomUUID()}`;
  }

  return `hunt-image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagem invalida."));
    };
    image.src = url;
  });
}

async function compressHuntImage(file: File): Promise<HuntImage> {
  const image = await readImage(file);
  const scale = Math.min(1, maxImageSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Nao foi possivel preparar a imagem.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return {
    id: makeImageId(),
    name: file.name || "Imagem da hunt",
    src: canvas.toDataURL("image/jpeg", imageQuality),
  };
}

export default function RegistrarHuntPage() {
  const { currentUser, data, isAdmin, removeHunt, saveHuntSession } = useAppData();
  const [title, setTitle] = useState("");
  const [character, setCharacter] = useState("");
  const [date, setDate] = useState(today());
  const [rawText, setRawText] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<HuntImage[]>([]);
  const [message, setMessage] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  const parsed = useMemo(() => parseHuntingAnalyser(rawText), [rawText]);
  const visibleHunts = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return data.hunts;

    return data.hunts.filter((hunt) => hunt.userId === currentUser.id);
  }, [currentUser, data.hunts, isAdmin]);

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

    if (!imageFiles.length) {
      setMessage(emptyMessage);
      return;
    }

    try {
      const preparedImages = await Promise.all(imageFiles.map(compressHuntImage));
      appendHuntImages(preparedImages, imageFiles.length);
    } catch {
      setMessage("Nao foi possivel carregar uma das imagens.");
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
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Nao foi possivel capturar a tela."));
      });
      await video.play();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const scale = Math.min(1, maxImageSize / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Nao foi possivel preparar o print.");
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      appendHuntImages(
        [
          {
            id: makeImageId(),
            name: "Print da hunt",
            src: canvas.toDataURL("image/jpeg", imageQuality),
          },
        ],
        1,
      );
    } catch {
      setMessage("Captura cancelada ou indisponivel.");
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      setIsCapturing(false);
    }
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
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
    });

    if (!saved) {
      setMessage("Entre na conta e cole o Hunting Analyser para salvar.");
      return;
    }

    setTitle("");
    setCharacter("");
    setRawText("");
    setNotes("");
    setImages([]);
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
              <span className="imageCounter">{images.length}/{maxHuntImages} imagens</span>
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
              </article>
            ))}
            {!visibleHunts.length ? <p className="mutedText">Nenhuma hunt registrada ainda.</p> : null}
          </div>
        </section>
      </section>
    </>
  );
}
