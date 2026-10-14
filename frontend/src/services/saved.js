// Storage adapter for saved molecules.

const STORAGE_KEY = "moleculens.saved.v1";
export const TYPES = ["ligand", "protein"];

// Ligands are keyed by PubChem CID, proteins by 4-character PDB ID (uppercase).
export function normalizeId(type, id) {
  const clean = String(id ?? "").trim();
  return type === "protein" ? clean.toUpperCase() : clean;
}

function emptyStore() {
  return { ligand: [], protein: [] };
}

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const store = emptyStore();
    for (const type of TYPES) {
      if (Array.isArray(parsed?.[type])) store[type] = parsed[type];
    }
    return store;
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  // Throws when storage is full or blocked; callers handle it.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function listSaved() {
  return readStore();
}

export async function addSaved(item) {
  const store = readStore();
  if (!store[item.type].some((i) => i.id === item.id)) {
    store[item.type] = [item, ...store[item.type]];
    writeStore(store);
  }
}

export async function removeSaved(type, id) {
  const store = readStore();
  store[type] = store[type].filter((i) => i.id !== id);
  writeStore(store);
}
