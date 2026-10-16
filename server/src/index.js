import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { loadUser, purgeExpiredSessions } from "./auth.js";
import authRoutes from "./routes/auth.js";
import savedRoutes from "./routes/saved.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Marks every API response as "don't cache" (these are per-user responses).
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Health check: tiny and fast, with no database and no login. Used to keep the server awake.
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.disable("x-powered-by");
app.set("trust proxy", process.env.NODE_ENV === "production" ? 2 : 1);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(loadUser);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/saved", savedRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

// Bad JSON and any unexpected crash end up here
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const purge = () =>
  purgeExpiredSessions().catch((e) =>
    console.error("Session cleanup failed:", e),
  );
purge(); // clean up once at startup
setInterval(purge, 60 * 60 * 1000).unref(); // then every hour
app.listen(PORT, () =>
  console.log(`MolecuLens API on http://localhost:${PORT}`),
);
