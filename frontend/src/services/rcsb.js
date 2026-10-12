import { fetchJson, optional } from "./http";

const DATA = "https://data.rcsb.org/rest/v1/core";
const GRAPHQL = "https://data.rcsb.org/graphql";
const SEARCH = "https://search.rcsb.org/rcsbsearch/v2/query";
const MAX_ENTITIES = 20; // big complexes (ribosomes) can have 80+ chains; cap the requests

// A PDB ID is 4 characters: a digit 1-9 followed by three letters/digits
export const PDB_ID = /^[1-9][A-Za-z0-9]{3}$/;

export const prettyMethod = (m) =>
  !m
    ? "—"
    : m
        .toLowerCase()
        .replace(/^./, (c) => c.toUpperCase())
        .replace(/nmr/g, "NMR");

export const formatResolution = (r) => (r ? `${r} Å` : "—");

// ---------- Search ----------
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

// One GraphQL request gives titles for a whole page of results.
export async function getEntrySummaries(ids, signal) {
  const query = `query($ids:[String!]!){
    entries(entry_ids:$ids){
      rcsb_id
      struct{title}
      exptl{method}
      rcsb_entry_info{resolution_combined}
      rcsb_accession_info{initial_release_date}
    }
  }`;
  const data = await fetchJson(GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { ids } }),
    signal,
  });
  const byId = new Map(
    (data?.data?.entries ?? []).filter(Boolean).map((e) => [e.rcsb_id, e]),
  );
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((e) => ({
      id: e.rcsb_id,
      title: e.struct?.title ?? "Untitled entry",
      method: e.exptl?.[0]?.method,
      resolution: e.rcsb_entry_info?.resolution_combined?.[0] ?? null,
      year: e.rcsb_accession_info?.initial_release_date?.slice(0, 4) ?? "—",
    }));
}

// ---------- Entry detail ----------
async function getEntry(pdbId, signal) {
  const id = pdbId.trim().toUpperCase();
  const e = await fetchJson(`${DATA}/entry/${id}`, { signal });
  const info = e.rcsb_entry_info ?? {};
  const cit = e.rcsb_primary_citation;
  return {
    id,
    title: e.struct?.title,
    keywords: e.struct_keywords?.pdbx_keywords,
    method: e.exptl?.map((x) => x.method).join(" + "),
    resolution: info.resolution_combined?.[0] ?? null,
    releaseDate: e.rcsb_accession_info?.initial_release_date?.slice(0, 10),
    depositDate: e.rcsb_accession_info?.deposit_date?.slice(0, 10),
    weightKda: info.molecular_weight,
    residueCount: info.deposited_polymer_monomer_count,
    atomCount: info.deposited_atom_count,
    polymerEntityCount: info.polymer_entity_count ?? 0,
    nonpolymerEntityCount: info.nonpolymer_entity_count ?? 0,
    citation: cit
      ? {
          title: cit.title,
          journal: cit.journal_abbrev,
          year: cit.year,
          doi: cit.pdbx_database_id_doi,
          pubmed: cit.pdbx_database_id_pub_med,
        }
      : null,
    entityIds: {
      polymer: e.rcsb_entry_container_identifiers?.polymer_entity_ids ?? [],
      nonpolymer:
        e.rcsb_entry_container_identifiers?.non_polymer_entity_ids ?? [],
    },
  };
}

async function getPolymer(pdbId, entityId, signal) {
  const p = await fetchJson(`${DATA}/polymer_entity/${pdbId}/${entityId}`, {
    signal,
  });
  const refs =
    p.rcsb_polymer_entity_container_identifiers
      ?.reference_sequence_identifiers ?? [];
  const organisms = [
    ...new Set(
      (p.rcsb_entity_source_organism ?? [])
        .map((o) => o.ncbi_scientific_name)
        .filter(Boolean),
    ),
  ];
  return {
    entityId,
    description:
      p.rcsb_polymer_entity?.pdbx_description ?? `Entity ${entityId}`,
    type: p.entity_poly?.rcsb_entity_polymer_type ?? "Polymer",
    sequence: (p.entity_poly?.pdbx_seq_one_letter_code_can ?? "").replace(
      /\s/g,
      "",
    ),
    length: p.entity_poly?.rcsb_sample_sequence_length,
    weightKda: p.rcsb_polymer_entity?.formula_weight,
    copies: p.rcsb_polymer_entity?.pdbx_number_of_molecules,
    organisms,
    chains: p.rcsb_polymer_entity_container_identifiers?.auth_asym_ids ?? [],
    uniprotIds: refs
      .filter((r) => r.database_name === "UniProt")
      .map((r) => r.database_accession),
  };
}

async function getNonpolymer(pdbId, entityId, signal) {
  const n = await fetchJson(`${DATA}/nonpolymer_entity/${pdbId}/${entityId}`, {
    signal,
  });
  const desc = n.nonpolymer_comp?.rcsb_chem_comp_descriptor;
  return {
    entityId,
    compId: n.pdbx_entity_nonpoly?.comp_id,
    name: n.pdbx_entity_nonpoly?.name,
    formula: n.nonpolymer_comp?.chem_comp?.formula,
    weight: n.rcsb_nonpolymer_entity?.formula_weight,
    copies: n.rcsb_nonpolymer_entity?.pdbx_number_of_molecules,
    inchiKey: desc?.in_chi_key,
    smiles: desc?.smiles,
  };
}

// Everything the detail page needs. Entry is required; entities are best-effort.
export async function getProtein(pdbId, signal) {
  const { entityIds, ...entry } = await getEntry(pdbId, signal);

  const polyIds = entityIds.polymer.slice(0, MAX_ENTITIES);
  const nonIds = entityIds.nonpolymer.slice(0, MAX_ENTITIES);

  const [polymers, nonpolymers] = await Promise.all([
    Promise.all(polyIds.map((n) => optional(getPolymer(entry.id, n, signal)))),
    Promise.all(
      nonIds.map((n) => optional(getNonpolymer(entry.id, n, signal))),
    ),
  ]);

  return {
    ...entry,
    polymers: polymers.filter(Boolean),
    nonpolymers: nonpolymers.filter(Boolean),
  };
}

// ---------- URLs ----------
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
export const assemblyImageUrl = (pdbId) =>
  `https://cdn.rcsb.org/images/structures/${pdbId.toLowerCase()}_assembly-1.jpeg`;
export const uniprotUrl = (acc) =>
  `https://www.uniprot.org/uniprotkb/${acc}/entry`;
