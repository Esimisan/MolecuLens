import express from "express";
import cookieParser from "cookie-parser";
import { loadUser, purgeExpiredSessions } from "./auth.js";
import authRoutes from "./routes/auth.js";
import savedRoutes from "./routes/saved.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.disable("x-powered-by");
app.set("trust proxy", 1);
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

purgeExpiredSessions(); // clean up once at startup
setInterval(purgeExpiredSessions, 60 * 60 * 1000).unref(); // then every hour

app.listen(PORT, () =>
  console.log(`MolecuLens API on http://localhost:${PORT}`),
);
