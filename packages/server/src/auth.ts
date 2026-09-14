import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import type { Config } from './config.js';
import { HttpError } from './errors.js';

const COOKIE = 'enlazia_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const MAX_ATTEMPTS = 5;
const MAX_GLOBAL_ATTEMPTS = 30;
const WINDOW_MS = 60_000;
const GLOBAL_KEY = '*';

const loginInput = z.object({ password: z.string().min(1).max(512) });

function sameBytes(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

function clientIp(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local';
}

function isHttps(c: Context): boolean {
  return c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';
}

export function createAuth(config: Config) {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  const sign = (issuedAt: string) => createHmac('sha256', config.sessionSecret).update(issuedAt).digest('base64url');
  const digest = (value: string) => createHash('sha256').update(value).digest();

  function isAuthenticated(c: Context): boolean {
    if (!config.password) return true;
    const [issuedAt, signature] = (getCookie(c, COOKIE) ?? '').split('.');
    if (!issuedAt || !signature) return false;
    if (!sameBytes(Buffer.from(signature), Buffer.from(sign(issuedAt)))) return false;
    const age = Date.now() - Number(issuedAt);
    return age >= 0 && age < MAX_AGE_SECONDS * 1000;
  }

  async function login(c: Context) {
    if (!config.password) return c.json({ ok: true });

    const ip = clientIp(c);
    const now = Date.now();
    const entry = attempts.get(ip);
    // The per-IP limit relies on forwarded headers, so a global limit backs it up against spoofing.
    const global = attempts.get(GLOBAL_KEY);
    const blocked = (e: typeof entry, max: number) => e && e.resetAt > now && e.count >= max;
    if (blocked(entry, MAX_ATTEMPTS) || blocked(global, MAX_GLOBAL_ATTEMPTS)) {
      throw new HttpError(429, 'Too many attempts, try again in a minute');
    }

    const { password } = loginInput.parse(await c.req.json());
    if (!sameBytes(digest(password), digest(config.password))) {
      for (const [key, current] of [[ip, entry], [GLOBAL_KEY, global]] as const) {
        const next = current && current.resetAt > now ? current : { count: 0, resetAt: now + WINDOW_MS };
        next.count += 1;
        attempts.set(key, next);
      }
      throw new HttpError(401, 'Invalid password');
    }

    attempts.delete(ip);
    const issuedAt = String(now);
    setCookie(c, COOKIE, `${issuedAt}.${sign(issuedAt)}`, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: isHttps(c),
      path: '/',
      maxAge: MAX_AGE_SECONDS,
    });
    return c.json({ ok: true });
  }

  function logout(c: Context) {
    deleteCookie(c, COOKIE, { path: '/' });
    return c.json({ ok: true });
  }

  const requireAuth: MiddlewareHandler = async (c, next) => {
    if (!isAuthenticated(c)) throw new HttpError(401, 'Authentication required');
    await next();
  };

  return { isAuthenticated, login, logout, requireAuth };
}
