import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readAppData, sessionCookieName, verifySessionToken, writeAppData } from "@/lib/serverData";
import type { LootBoss } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "boss";
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const state = await readAppData();
  const userId = verifySessionToken(cookieStore.get(sessionCookieName)?.value);
  const user = userId ? state.data.users.find((entry) => entry.id === userId) : null;

  return user?.role === "admin" ? { state, user } : null;
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
    }

    const body = (await request.json()) as Pick<LootBoss, "label" | "mode">;
    const label = body.label?.trim();
    const mode = body.mode === "duo" ? "duo" : body.mode === "solo" ? "solo" : null;

    if (!label || !mode) {
      return NextResponse.json({ ok: false, error: "Dados do boss invalidos." }, { status: 400 });
    }

    if (session.state.data.lootBosses.some((boss) => boss.label.toLowerCase() === label.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Esse boss ja esta cadastrado." }, { status: 409 });
    }

    const baseKey = slugify(label);
    const keys = new Set(session.state.data.lootBosses.map((boss) => boss.key));
    let key = baseKey;
    let index = 2;

    while (keys.has(key)) {
      key = `${baseKey}-${index}`;
      index += 1;
    }

    const boss: LootBoss = { key, label, mode, drops: [] };

    await writeAppData({
      ...session.state.data,
      lootBosses: [...session.state.data.lootBosses, boss],
    });

    return NextResponse.json({ ok: true, boss });
  } catch {
    return NextResponse.json({ ok: false, error: "Nao foi possivel criar o boss." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
    }

    const body = (await request.json()) as { key?: string; patch?: Partial<Pick<LootBoss, "label" | "mode">> };
    const key = body.key?.trim();
    const boss = key ? session.state.data.lootBosses.find((entry) => entry.key === key) : null;

    if (!boss) {
      return NextResponse.json({ ok: false, error: "Boss nao encontrado." }, { status: 404 });
    }

    const requestedLabel = body.patch?.label?.trim();
    const label = requestedLabel || boss.label;
    const mode = body.patch?.mode === "duo" || body.patch?.mode === "solo" ? body.patch.mode : boss.mode;
    const updated: LootBoss = { ...boss, label, mode };

    await writeAppData({
      ...session.state.data,
      lootBosses: session.state.data.lootBosses.map((entry) => (entry.key === boss.key ? updated : entry)),
    });

    return NextResponse.json({ ok: true, boss: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "Nao foi possivel atualizar o boss." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
    }

    const body = (await request.json()) as { key?: string };
    const key = body.key?.trim();
    const boss = key ? session.state.data.lootBosses.find((entry) => entry.key === key) : null;

    if (!boss) {
      return NextResponse.json({ ok: false, error: "Boss nao encontrado." }, { status: 404 });
    }

    await writeAppData({
      ...session.state.data,
      lootBosses: session.state.data.lootBosses.filter((entry) => entry.key !== boss.key),
    });

    return NextResponse.json({ ok: true, key: boss.key });
  } catch {
    return NextResponse.json({ ok: false, error: "Nao foi possivel remover o boss." }, { status: 503 });
  }
}
