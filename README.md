# MolecuLens

**One place to explore small molecules and proteins.** MolecuLens searches the PubChem and RCSB PDB databases, shows structures in 2D and interactive 3D, lets you compare two molecules side by side, and lets you save your favourites to an account.

**Live site: https://moleculens.vercel.app/

---

## Features

- **Ligand Explorer.** Search a compound by name, PubChem CID or InChIKey. Shows formula, molecular weight, IUPAC name, canonical and isomeric SMILES, InChI, InChIKey, computed properties, synonyms and a 2D structure. Includes an interactive 3D conformer and SDF download, with copy buttons on every identifier.
- **Protein Explorer.** Search the PDB by keyword or 4-character PDB ID. Shows title, organism, experimental method, resolution, sequence, UniProt links and bound ligands. Bound ligands link straight into the Ligand Explorer. Includes an interactive 3D structure and PDB / mmCIF / FASTA downloads.
- **Compare.** Ligand vs ligand or protein vs protein, with side-by-side 3D viewers and a property table. Rows that differ are highlighted, numeric rows show a "B minus A" delta, and a toggle shows only the differences.
- **Accounts and saved molecules.** Register and log in, then save ligands and proteins to your account (not your browser) and open them from the Saved panel.
- **Fully responsive.** Works down to phone width, including a trimmed-down 3D viewer on small screens.
- **Shareable URLs.** The URL is the state, so any search, protein or comparison can be bookmarked or sent to someone.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite), react-router-dom, plain CSS (rem/em units) |
| 3D | Mol* (`molstar`) |
| Backend | Node.js + Express |
| Database | Turso (hosted SQLite / libSQL) |
| Auth | Session cookies, scrypt password hashing |
| Hosting | Vercel (frontend), Render (backend), Turso (database) |

---

## Data sources

### PubChem (PUG REST) → Ligand Explorer
Used for everything about small molecules:
- Resolving a compound from a **name, CID or InChIKey**
- Identifiers (CID, IUPAC name, canonical and isomeric SMILES, InChI, InChIKey), molecular formula and weight
- Computed properties such as rotatable bonds and heavy atoms
- Synonyms
- The 2D structure image, the **SDF download**, and the **3D conformer SDF** that feeds the 3D viewer

### RCSB Protein Data Bank → Protein Explorer
Used for everything about protein structures:
- **Full-text search** to find entries from a keyword
- **GraphQL** to fetch summaries for the results list in one request
- **Data API** for a full entry, its polymer entities (sequence, organism, mass) and its non-polymer entities (bound ligands), each capped at 20 to keep pages fast
- `models.rcsb.org` for the structure files the 3D viewer loads (`.bcif`), plus assembly images and PDB / mmCIF / FASTA downloads
- UniProt cross-reference links

### How the two connect
A protein's bound ligands carry an InChIKey. The ligand link goes to `/ligands?q=<InChIKey>`, and the PubChem service resolves InChIKeys, so you can jump from a protein straight to its ligand's page.

---

## Frontend decisions

- **Vite + React with a clear folder layout.** `components/`, `pages/`, `styles/`, `services/`, `hooks/`, `context/`. Every component or page has its own CSS file in `styles/`, imported from its JSX file. Only `index.css` (design tokens and shared classes like `.glass-card`, `.btn`, `.eyebrow`) lives in `src/`.
- **A services layer.** All network code lives in `services/` (`pubchem.js`, `rcsb.js`, `compare.js`, `saved.js`, `auth.js`, `api.js`), so components never call `fetch` directly. This also made it possible to swap the saved-molecule storage from localStorage to the backend by changing three function bodies, with no component changes.
- **The URL is the state.** Searches, protein IDs and comparisons live in query params (`/ligands?q=`, `/proteins?id=`, `/compare?type=&a=&b=`). Pages are bookmarkable, shareable, and survive a reload. The header remembers the last view in each section when you switch tabs.
- **Explicit loading / empty / error states.** Shared `Loading`, `EmptyState` and `ErrorMessage` components. Errors are typed (`not-found`, `network`, `server`) so the UI can say something useful.
- **Request cancellation.** Searches use `AbortController`, so fast typing or navigating away never shows stale results.
- **Resilient HTTP layer.** PubChem is rate-limited and sometimes returns 503s. The shared `http.js` spaces PubChem requests 300 ms apart, retries with backoff on 429 / 502 / 503 / 504 (up to 3 times, plus one network retry) and caches GET requests in memory so React StrictMode and Compare don't fetch the same thing twice.
- **Mol* for 3D.** Chosen over 3Dmol.js for the full RCSB-style experience. It's lazy-loaded so it doesn't weigh down the first page load.
  - On phones the viewer shows just the canvas and a small toolbar, because Mol*'s side panels otherwise fill the whole screen.
  - Compact vs full layout is decided by the **viewer's own container width** (via `ResizeObserver`), not the window width, so the two half-width viewers on Compare get the compact layout on desktop too.
  - The viewer wrapper deliberately isn't a `.glass-card`, because `backdrop-filter` breaks Mol*'s fullscreen mode.
- **Optimistic saves.** Saving or removing updates the UI immediately and re-syncs if the server write fails.
- **Responsive by default.** Layout CSS uses rem/em, em-based media queries and `clamp()` for fluid sizing. Pixels are used only for 1px borders and pill radii.
- **Design.** Monochrome, Inter, frosted-glass cards, pill buttons, big tight uppercase headlines. The only colour is a muted red for errors.

---

## Backend decisions and trade-offs

The backend exists for one reason: so saved molecules belong to an **account**, not to one browser.

**Express API**

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account (name, email, password) |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user, or `{"user": null}` |
| GET | `/api/saved` | List saved molecules |
| POST | `/api/saved` | Save a ligand or protein |
| DELETE | `/api/saved/:type/:id` | Remove a saved molecule |

All `/api/saved` routes require a login.

| Decision | Why | Trade-off |
|---|---|---|
| **Session cookies** instead of JWTs | Simple, revocable server-side, and the browser handles it | Needs a session table and expired-session cleanup |
| **scrypt** password hashing | Built into Node, so no extra dependency | Slower than a plain hash by design; that's the point |
| **Rate-limited** login and register | Slows down password guessing | A legitimate user can occasionally get throttled |
| **Name + email + password** | Gives a personal greeting ("Welcome, …" / "Welcome back, …") | Collects one more field than email-only |
| **Normalised IDs** (ligand = PubChem CID, protein = uppercase PDB ID) | One saved item can't be stored twice under different spellings | Needs normalising on every write |
| **Backend only stores saves and accounts** | PubChem and RCSB are called directly from the browser | Everyone's browser talks to those APIs directly (hence the retry logic) instead of one cached server |
| **`/api` forwarded by Vercel to Render** | The browser only sees one origin, so cookies stay first-party and there's no CORS setup | The frontend depends on the Render URL in `frontend/vercel.json` |
| **Render free plan** | Free | The server sleeps when idle, so the first request after a pause is slow |

---

## Database

**The database is hosted on [Turso](https://turso.tech)**, a hosted SQLite (libSQL) service.

- **Stores:** users, sessions, and saved ligands/proteins. Nothing from PubChem or RCSB is stored; that data is fetched live.
- **Connection:** the Render backend connects using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, set as environment variables on Render. Locally they live in `server/.env`, which is git-ignored. **Credentials are never committed.**
- **Inspecting it:** open the Turso dashboard, or use any SQLite/libSQL-compatible tool such as DB Browser for SQLite.

### Why Turso (and not a file or Postgres)
- I started with a plain **SQLite file** via `better-sqlite3`, which is perfect for development: zero setup and very fast.
- **Render's free tier has a non-persistent filesystem**, so a file database would be wiped on every redeploy or restart, losing every account.
- I considered **Postgres** (Neon / Supabase), but it would mean rewriting the SQL for a different dialect. **Turso keeps the same SQLite model**, so the schema and queries stayed essentially the same.
- **Trade-off:** it adds a network hop per query and a third external service to manage, in exchange for data that survives deploys.

---

## Project structure

```
molecule-explorer/
├── frontend/                 # React (Vite) app
│   ├── public/               # logo, favicon
│   ├── vercel.json           # /api rewrite to Render + SPA fallback
│   └── src/
│       ├── components/       # Header, SavedPanel, SaveButton, MolViewer, StructureViewer, CompareSlot, CompareTable, ...
│       ├── pages/            # Home, LigandExplorer, ProteinExplorer, Compare, Login, Register
│       ├── services/         # pubchem, rcsb, compare, saved, auth, api, http
│       ├── context/          # auth and saved providers
│       ├── hooks/            # useAuth, useSaved, useCompareItem
│       ├── styles/           # one CSS file per component/page
│       └── index.css         # design tokens + shared classes
└── server/                   # Express API
    └── src/
        ├── index.js
        ├── db.js
        ├── auth.js
        └── routes/           # auth.js, saved.js
```

---

## Local development

Requires Node.js.

```bash
# 1. Backend
cd server
npm install
# create server/.env with:
#   TURSO_DATABASE_URL=...
#   TURSO_AUTH_TOKEN=...
npm run dev            # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev            # Vite proxies /api to http://localhost:4000
```

## Deployment

| Part | Host | Notes |
|---|---|---|
| Frontend | Vercel | Root directory `frontend`; no environment variables; `vercel.json` rewrites `/api` to the backend |
| Backend | Render | Root directory `server`; start command `npm start`; env vars `NODE_ENV`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| Database | Turso | Hosted SQLite |

---

## Roadmap
-I plan on expanding this website in the future, add more features that will ease and quicken the molecular docking and molecular dynamics process 

## Credits

Data from [PubChem](https://pubchem.ncbi.nlm.nih.gov/) and the [RCSB Protein Data Bank](https://www.rcsb.org/). 3D viewing by [Mol*](https://molstar.org/). Please follow each service's terms of use and cite them if you use results in research.

## Author

Name: Esimisan Akra · [Portfolio](https://akra-gamma.vercel.app/) 
