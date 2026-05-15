import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ pathname: string[] }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { pathname } = await context.params;
    const blobPath = pathname.join("/");
    const result = await get(blobPath, { access: "private", useCache: true });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
    }

    return new Response(result.stream, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": result.blob.contentType || "image/jpeg",
      },
    });
  } catch {
    return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
  }
}
