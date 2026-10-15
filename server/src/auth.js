import {
  randomBytes,
  createHash,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { get, run } from "./db.js";

const scrypt = promisify(scryptCb);

export const COOKIE_NAME = "moleculens_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/* ---------- passwords ---------- */

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(":");
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}

/* ---------- sessions ---------- */

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}

export async function createSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  await run(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [sha256(token), userId, Date.now() + SESSION_MS],
  );
  res.cookie(COOKIE_NAME, token, cookieOptions(SESSION_MS));
}

export async function destroySession(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token)
    await run("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

/* ---------- middleware ---------- */

// Runs on every request. If the cookie holds a valid session, sets req.user.
export async function loadUser(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      const row = await get(
        `SELECT u.id, u.name, u.email, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
        [sha256(token)],
      );
      if (row && row.expires_at > Date.now()) {
        req.user = { id: row.id, name: row.name, email: row.email };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Put in front of any route that needs a logged-in user.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Log in to continue." });
  next();
}

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

export async function purgeExpiredSessions() {
  await run("DELETE FROM sessions WHERE expires_at < ?", [Date.now()]);
}
