import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readAppData, sanitizeUser, sessionCookieName, verifySessionToken } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = verifySessionToken(cookieStore.get(sessionCookieName)?.value);
    const state = await readAppData();
    const user = userId ? state.data.users.find((entry) => entry.id === userId) : null;

    return NextResponse.json({ user: user ? sanitizeUser(user) : null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
