import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  hashPassword,
  readAppData,
  sessionCookieName,
  verifyPassword,
  verifySessionToken,
  writeAppData,
} from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const minPasswordLength = 6;
const maxPasswordLength = 128;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = verifySessionToken(cookieStore.get(sessionCookieName)?.value);

    if (!userId) {
      return NextResponse.json({ error: "Sessao expirada. Entre novamente." }, { status: 401 });
    }

    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (newPassword.length < minPasswordLength || newPassword.length > maxPasswordLength) {
      return NextResponse.json(
        { error: `A nova senha precisa ter entre ${minPasswordLength} e ${maxPasswordLength} caracteres.` },
        { status: 400 },
      );
    }

    const state = await readAppData();

    if (!state.remote) {
      return NextResponse.json({ error: "Trocar a senha exige o armazenamento remoto configurado." }, { status: 503 });
    }

    const user = state.data.users.find((entry) => entry.id === userId);

    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    }

    if (!verifyPassword(currentPassword, user)) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
    }

    await writeAppData({
      ...state.data,
      users: state.data.users.map((entry) =>
        entry.id === user.id ? { ...entry, password: "", passwordHash: hashPassword(newPassword) } : entry,
      ),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel alterar a senha agora." }, { status: 500 });
  }
}
