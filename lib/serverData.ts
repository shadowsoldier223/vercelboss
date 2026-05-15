import { get, put } from "@vercel/blob";
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeAppData } from "./data";
import { defaultData } from "./defaults";
import type { AppData, AppUser, PublicUser } from "./types";

export const statePath = "closedboss/app-data.json";
export const sessionCookieName = "closedboss-session-token";

const passwordIterations = 120000;
const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function authSecret() {
  return process.env.AUTH_SECRET || process.env.BLOB_READ_WRITE_TOKEN || "closedboss-local-secret";
}

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = base64url(JSON.stringify({ sub: userId, exp: Date.now() + sessionDurationMs }));
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return null;

  const [payload, signature] = token.split(".");

  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };

    if (!parsed.sub || !parsed.exp || parsed.exp < Date.now()) return null;

    return parsed.sub;
  } catch {
    return null;
  }
}

export function sanitizeUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export function sanitizeData(data: AppData): AppData {
  return {
    ...data,
    users: data.users.map((user) => ({ ...sanitizeUser(user), password: "" })),
  };
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, passwordIterations, 32, "sha256").toString("hex");

  return `pbkdf2:${passwordIterations}:${salt}:${hash}`;
}

export function verifyPassword(password: string, user: AppUser) {
  if (user.passwordHash?.startsWith("pbkdf2:")) {
    const [, iterationValue, salt, expectedHash] = user.passwordHash.split(":");
    const iterations = Number(iterationValue);
    const actual = pbkdf2Sync(password, salt, iterations, 32, "sha256");
    const expected = Buffer.from(expectedHash, "hex");

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  return Boolean(user.password) && user.password === password;
}

function mergeUserSecrets(incomingUsers: AppUser[], previousUsers: AppUser[]) {
  return incomingUsers.map((user) => {
    const previous = previousUsers.find((entry) => entry.id === user.id || entry.username.toLowerCase() === user.username.toLowerCase());
    const password = user.password?.trim();

    return {
      ...user,
      password: "",
      passwordHash:
        password || user.password
          ? hashPassword(password || user.password || "")
          : user.passwordHash || previous?.passwordHash || (previous?.password ? hashPassword(previous.password) : undefined),
    };
  });
}

export async function readAppData() {
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

export async function writeAppData(data: Partial<AppData>) {
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

export async function writePublicAppData(data: Partial<AppData>) {
  const previous = await readAppData();
  const normalized = normalizeAppData(data);
  const withSecrets = {
    ...normalized,
    users: mergeUserSecrets(normalized.users, previous.data.users),
  };

  return writeAppData(withSecrets);
}
