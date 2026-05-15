import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { makeId } from "@/lib/data";
import type { HuntImage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "hunt";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.type.startsWith("image/"))
      .slice(0, 6);
    const images: HuntImage[] = [];

    for (const file of files) {
      const id = makeId("hunt-image");
      const pathname = `closedboss/hunt-images/${Date.now()}-${safeName(file.name)}-${id}.jpg`;

      await put(pathname, file, {
        access: "private",
        allowOverwrite: true,
        cacheControlMaxAge: 60 * 60 * 24 * 30,
        contentType: file.type || "image/jpeg",
      });

      images.push({
        id,
        name: file.name || "Imagem da hunt",
        src: `/api/hunt-images/${pathname}`,
        pathname,
      });
    }

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { pathnames?: string[] };
    const pathnames = Array.isArray(body.pathnames) ? body.pathnames.filter(Boolean) : [];

    if (pathnames.length) {
      await del(pathnames);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
