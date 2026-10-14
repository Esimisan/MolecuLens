// Storage adapter for saved molecules, backed by the Express API.

export const TYPES = ["ligand", "protein"];

// Ligands are keyed by PubChem CID, proteins by 4-character PDB ID (uppercase).
export function normalizeId(type, id) {
  const clean = String(id ?? "").trim();
  return type === "protein" ? clean.toUpperCase() : clean;
}

function emptyStore() {
  return { ligand: [], protein: [] };
}

// One small wrapper so every call handles JSON, cookies and errors the same way.
async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: "same-origin", // sends the session cookie (the Vite proxy keeps it same-origin)
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Network error");
  }

  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// Accept { ligand: [], protein: [] }, a flat array, or { items: [] }.
function toStore(data) {
  const store = emptyStore();
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : null;

  if (rows) {
    for (const row of rows) {
      if (TYPES.includes(row?.type)) store[row.type].push(row);
    }
  } else {
    for (const type of TYPES) {
      if (Array.isArray(data?.[type])) store[type] = data[type];
    }
  }
  return store;
}

export async function listSaved() {
  try {
    return toStore(await request("/api/saved"));
  } catch (err) {
    // Logged out is not an error here: there is simply nothing saved to show.
    if (err.status === 401) return emptyStore();
    throw err;
  }
}

export async function addSaved(item) {
  await request("/api/saved", { method: "POST", body: item });
}

export async function removeSaved(type, id) {
  await request(`/api/saved/${type}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
