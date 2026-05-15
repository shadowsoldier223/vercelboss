import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readAppData, sanitizeData, sessionCookieName, verifySessionToken, writePublicAppData } from "@/lib/serverData";
import type { AppData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = verifySessionToken(cookieStore.get(sessionCookieName)?.value);
  const state = await readAppData();
  const user = userId ? state.data.users.find((entry) => entry.id === userId) : null;

  return user?.role === "admin" ? { state, user } : null;
}

export async function GET() {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  return new Response(JSON.stringify(session.state.data, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="closedboss-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Content-Type": "application/json",
    },
  });
}

export async function POST(request: Request) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<AppData>;
    const restored = await writePublicAppData(body);

    return NextResponse.json({ ok: true, data: sanitizeData(restored) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
