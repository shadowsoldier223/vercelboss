import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { normalizeAppData } from "@/lib/data";
import { defaultData } from "@/lib/defaults";
import type { AppData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statePath = "closedboss/app-data.json";

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readState() {
  if (!hasBlobToken()) {
    return { data: defaultData, initialized: false, remote: false };
  }

  const result = await get(statePath, { access: "private", useCache: false });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return { data: defaultData, initialized: false, remote: true };
  }

  const text = await new Response(result.stream).text();
  const parsed = text.trim() ? (JSON.parse(text) as Partial<AppData>) : null;

  return { data: normalizeAppData(parsed), initialized: true, remote: true };
}

async function writeState(data: Partial<AppData>) {
  if (!hasBlobToken()) {
    throw new Error("BLOB_READ_WRITE_TOKEN nao configurado.");
  }

  const normalized = normalizeAppData(data);

  await put(statePath, JSON.stringify(normalized), {
    access: "private",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json",
  });

  return normalized;
}

export async function GET() {
  try {
    return NextResponse.json(await readState());
  } catch {
    return NextResponse.json({ data: defaultData, initialized: false, remote: false }, { status: 200 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<AppData>;
    const data = await writeState(body);

    return NextResponse.json({ ok: true, data, remote: true });
  } catch {
    return NextResponse.json({ ok: false, remote: false }, { status: 503 });
  }
}
