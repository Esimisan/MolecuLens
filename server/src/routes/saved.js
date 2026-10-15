import { Router } from "express";
import { get, all, run } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth); // every route in this file needs a logged-in user

const TYPES = new Set(["ligand", "protein"]);
const MAX_PER_USER = 500;

// Same rule as the front end: ligand = PubChem CID digits, protein = uppercase PDB ID
function normalise(type, rawId) {
  const id = String(rawId ?? "").trim();
  if (type === "ligand") return /^\d{1,12}$/.test(id) ? id : null;
  if (type === "protein")
    return /^[0-9][A-Za-z0-9]{3}$/.test(id) ? id.toUpperCase() : null;
  return null;
}

const toItem = (r) => ({
  type: r.type,
  id: r.item_id,
  title: r.title,
  subtitle: r.subtitle,
  savedAt: r.saved_at,
});

router.get("/", async (req, res, next) => {
  try {
    const rows = await all(
      "SELECT * FROM saved WHERE user_id = ? ORDER BY saved_at DESC",
      [req.user.id],
    );
    res.json({ items: rows.map(toItem) });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const type = req.body?.type;
    if (!TYPES.has(type))
      return res
        .status(400)
        .json({ error: 'type must be "ligand" or "protein".' });
    const id = normalise(type, req.body?.id);
    if (!id)
      return res.status(400).json({ error: `That is not a valid ${type} id.` });

    const title = String(req.body?.title ?? "").slice(0, 300);
    const subtitle = String(req.body?.subtitle ?? "").slice(0, 300);

    const existing = await get(
      "SELECT saved_at FROM saved WHERE user_id = ? AND type = ? AND item_id = ?",
      [req.user.id, type, id],
    );

    if (!existing) {
      const { n } = await get(
        "SELECT COUNT(*) AS n FROM saved WHERE user_id = ?",
        [req.user.id],
      );
      if (n >= MAX_PER_USER) {
        return res
          .status(400)
          .json({ error: `You can save up to ${MAX_PER_USER} items.` });
      }
    }

    const savedAt = existing?.saved_at ?? Date.now();
    await run(
      `INSERT INTO saved (user_id, type, item_id, title, subtitle, saved_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, type, item_id)
       DO UPDATE SET title = excluded.title, subtitle = excluded.subtitle`,
      [req.user.id, type, id, title, subtitle, savedAt],
    );

    res
      .status(existing ? 200 : 201)
      .json({ item: { type, id, title, subtitle, savedAt } });
  } catch (err) {
    next(err);
  }
});

router.delete("/:type/:id", async (req, res, next) => {
  try {
    const { type } = req.params;
    if (!TYPES.has(type))
      return res.status(400).json({ error: "Unknown type." });
    const id = normalise(type, req.params.id);
    if (!id)
      return res.status(400).json({ error: `That is not a valid ${type} id.` });
    await run(
      "DELETE FROM saved WHERE user_id = ? AND type = ? AND item_id = ?",
      [req.user.id, type, id],
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
