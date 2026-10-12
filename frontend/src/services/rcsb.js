import { fetchJson } from "./http";

const DATA = "https://data.rcsb.org/rest/v1/core";
const SEARCH = "https://search.rcsb.org/rcsbsearch/v2/query";

// Full-text search. Returns { total, ids }. A 204 (no results) becomes an empty list.
export async function searchEntries(
  text,
  { rows = 10, start = 0 } = {},
  signal,
) {
  const body = {
    query: {
      type: "terminal",
      service: "full_text",
      parameters: { value: text.trim() },
    },
    return_type: "entry",
    request_options: { paginate: { start, rows } },
  };
  const data = await fetchJson(
    `${SEARCH}?json=${encodeURIComponent(JSON.stringify(body))}`,
    { signal },
  );
  return {
    total: data?.total_count ?? 0,
    ids: data?.result_set?.map((r) => r.identifier) ?? [],
  };
}

// Basic entry info. Organism, sequence and ligands come from extra endpoints in Step 7.
export async function getEntry(pdbId, signal) {
  const id = pdbId.trim().toUpperCase();
  const e = await fetchJson(`${DATA}/entry/${id}`, { signal });
  return {
    id,
    title: e.struct?.title,
    method: e.exptl?.[0]?.method,
    resolution: e.rcsb_entry_info?.resolution_combined?.[0] ?? null,
    releaseDate: e.rcsb_accession_info?.initial_release_date,
    raw: e,
  };
}

export const downloadUrls = (pdbId) => {
  const id = pdbId.toUpperCase();
  return {
    pdb: `https://files.rcsb.org/download/${id}.pdb`,
    cif: `https://files.rcsb.org/download/${id}.cif`,
    fasta: `https://www.rcsb.org/fasta/entry/${id}`,
  };
};

export const rcsbPageUrl = (pdbId) =>
  `https://www.rcsb.org/structure/${pdbId.toUpperCase()}`;
