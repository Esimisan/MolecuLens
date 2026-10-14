import { Router } from "express";
import rateLimit from "express-rate-limit";
import db from "../db.js";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  publicUser,
} from "../auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v) => (typeof v === "string" ? v.trim() : "");

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const name = clean(req.body?.name);
    const email = clean(req.body?.email).toLowerCase();
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    const fields = {};
    if (!name) fields.name = "Enter your name.";
    else if (name.length > 80) fields.name = "Use 80 characters or fewer.";
    if (!EMAIL_RE.test(email) || email.length > 254)
      fields.email = "Enter a valid email address.";
    if (password.length < 8) fields.password = "Use at least 8 characters.";
    else if (password.length > 200)
      fields.password = "Use 200 characters or fewer.";
    if (Object.keys(fields).length) {
      return res
        .status(400)
        .json({ error: "Check the highlighted fields.", fields });
    }

    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      return res.status(409).json({
        error: "An account with this email already exists.",
        fields: { email: "An account with this email already exists." },
      });
    }

    const hash = await hashPassword(password);
    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      )
      .run(name, email, hash);

    const user = { id: Number(lastInsertRowid), name, email };
    createSession(res, user.id);
    res.status(201).json({ user: publicUser(user), isNew: true });
  } catch (err) {
    next(err);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const email = clean(req.body?.email).toLowerCase();
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const row = email
      ? db.prepare("SELECT * FROM users WHERE email = ?").get(email)
      : null;

    const ok =
      row && password && (await verifyPassword(password, row.password_hash));
    if (!ok)
      return res.status(401).json({ error: "Email or password is incorrect." });

    createSession(res, row.id);
    res.json({ user: publicUser(row), isNew: false });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

// The front end calls this on page load to ask "who am I?"
router.get("/me", (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

export default router;
