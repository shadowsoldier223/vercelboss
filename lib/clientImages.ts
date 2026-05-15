import type { HuntImage } from "./types";

const maxImageSize = 1200;
const imageQuality = 0.78;

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

function canvasToFile(canvas: HTMLCanvasElement, fileName: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Nao foi possivel preparar a imagem."));
          return;
        }

        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      imageQuality,
    );
  });
}

export async function compressHuntImageFile(file: File) {
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

  const safeName = file.name.replace(/\.[^.]+$/, "") || "hunt";

  return canvasToFile(canvas, `${safeName}.jpg`);
}

export async function captureScreenAsFile() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Captura de tela indisponivel neste navegador.");
  }

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

    return canvasToFile(canvas, "print-da-hunt.jpg");
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

export async function uploadHuntImageFiles(files: File[]) {
  if (!files.length) return [];

  const formData = new FormData();

  files.forEach((file) => formData.append("images", file));

  const response = await fetch("/api/hunt-images", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel enviar as imagens.");
  }

  const payload = (await response.json()) as { images?: HuntImage[] };

  return payload.images ?? [];
}

export async function deleteHuntImages(images: HuntImage[]) {
  const pathnames = images.map((image) => image.pathname).filter(Boolean);

  if (!pathnames.length) return;

  await fetch("/api/hunt-images", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathnames }),
  }).catch(() => undefined);
}
