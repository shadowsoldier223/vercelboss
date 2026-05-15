import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  readAppData,
  sanitizeUser,
  sessionCookieName,
  verifyPassword,
  writeAppData,
} from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const state = await readAppData();
    const user = state.data.users.find((entry) => entry.username.toLowerCase() === username);

    if (!user || !verifyPassword(password, user)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const hasPlainTextPassword = state.data.users.some((entry) => entry.password && !entry.passwordHash);

    if (hasPlainTextPassword) {
      await writeAppData({
        ...state.data,
        users: state.data.users.map((entry) =>
          entry.password && !entry.passwordHash
            ? {
                ...entry,
                password: "",
                passwordHash: hashPassword(entry.id === user.id ? password : entry.password),
              }
            : entry,
        ),
      });
    }

    const cookieStore = await cookies();

    cookieStore.set(sessionCookieName, createSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(user) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
