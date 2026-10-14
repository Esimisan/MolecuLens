import {
  randomBytes,
  createHash,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import db from "./db.js";

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

export function createSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(sha256(token), userId, Date.now() + SESSION_MS);
  res.cookie(COOKIE_NAME, token, cookieOptions(SESSION_MS));
}

export function destroySession(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token)
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

/* ---------- middleware ---------- */

// Runs on every request. If the cookie holds a valid session, sets req.user.
export function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const row = db
      .prepare(
        `SELECT u.id, u.name, u.email, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
      )
      .get(sha256(token));
    if (row && row.expires_at > Date.now()) {
      req.user = { id: row.id, name: row.name, email: row.email };
    }
  }
  next();
}

// Put in front of any route that needs a logged-in user.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Log in to continue." });
  next();
}

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

export function purgeExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
}
