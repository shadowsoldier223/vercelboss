import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { defaultData } from "@/lib/defaults";
import { readAppData, sanitizeData, sessionCookieName, verifySessionToken, writePublicAppData } from "@/lib/serverData";
import type { AppData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await readAppData();

    return NextResponse.json({ ...state, data: sanitizeData(state.data) });
  } catch {
    return NextResponse.json({ data: defaultData, initialized: false, remote: false }, { status: 200 });
  }
}

export async function PUT(request: Request) {
  try {
    const state = await readAppData();
    const cookieStore = await cookies();
    const userId = verifySessionToken(cookieStore.get(sessionCookieName)?.value);
    const user = userId ? state.data.users.find((entry) => entry.id === userId) : null;

    if (!user) {
      return NextResponse.json({ ok: false, remote: true }, { status: 401 });
    }

    const incoming = (await request.json()) as Partial<AppData>;
    // Usuarios, duos e bosses so podem ser alterados por admin (a UI ja impoe isso,
    // aqui o servidor tambem impoe). Evita que um usuario comum se promova a admin.
    const body: Partial<AppData> =
      user.role === "admin"
        ? incoming
        : {
            ...incoming,
            users: state.data.users,
            duos: state.data.duos,
            lootBosses: state.data.lootBosses,
          };
    const data = await writePublicAppData(body);

    return NextResponse.json({ ok: true, data: sanitizeData(data), remote: true });
  } catch {
    return NextResponse.json({ ok: false, remote: false }, { status: 503 });
  }
}
