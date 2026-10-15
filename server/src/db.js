import "dotenv/config";
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// In production we must never fall back to a local file: on Render's free plan
// it would be wiped on every restart and you'd lose all accounts silently.
if (!url && process.env.NODE_ENV === "production") {
  throw new Error("TURSO_DATABASE_URL is not set.");
}

let config;
if (url) {
  config = { url, authToken };
} else {
  // Local fallback for development when no Turso variables are set
  mkdirSync("data", { recursive: true });
  config = { url: "file:data/moleculens.db" };
}

const db = createClient(config);
console.log(`Database: ${url ? "Turso" : "local file (data/moleculens.db)"}`);

// Create the tables if they don't exist yet (safe to run on every start)
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS saved (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type     TEXT    NOT NULL CHECK (type IN ('ligand', 'protein')),
    item_id  TEXT    NOT NULL,
    title    TEXT    NOT NULL DEFAULT '',
    subtitle TEXT    NOT NULL DEFAULT '',
    saved_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, type, item_id)
  );
`);

/* ---------- small helpers so queries stay one-liners ---------- */

// First matching row, or null
export async function get(sql, args = []) {
  const { rows } = await db.execute({ sql, args });
  return rows[0] ?? null;
}

// All matching rows
export async function all(sql, args = []) {
  const { rows } = await db.execute({ sql, args });
  return rows;
}

// INSERT / UPDATE / DELETE. Returns { rowsAffected, lastInsertRowid }
export function run(sql, args = []) {
  return db.execute({ sql, args });
}

export default db;
