import { getCompound } from "./pubchem";
import { getProtein } from "./rcsb";

// ---------- helpers ----------
const get = (obj, path) =>
  path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

// First non-empty value among several possible field names.
function pick(obj, ...paths) {
  for (const p of paths) {
    const v = get(obj, p);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const unique = (arr) => [...new Set(arr)];
const toNum = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ---------- loaders ----------
export async function loadLigand(query) {
  const raw = await getCompound(query);
  if (import.meta.env.DEV) console.debug("[compare] ligand raw:", raw);
  return {
    kind: "ligand",
    cid: pick(raw, "cid", "CID", "properties.CID"),
    name:
      pick(raw, "title", "name", "synonyms.0", "iupacName", "IUPACName") ??
      query,
    formula: pick(
      raw,
      "formula",
      "molecularFormula",
      "MolecularFormula",
      "properties.MolecularFormula",
    ),
    weight: pick(
      raw,
      "weight",
      "molecularWeight",
      "MolecularWeight",
      "properties.MolecularWeight",
    ),
    exactMass: pick(raw, "exactMass", "ExactMass", "properties.ExactMass"),
    xlogp: pick(raw, "xlogp", "xLogP", "XLogP", "properties.XLogP"),
    tpsa: pick(raw, "tpsa", "TPSA", "properties.TPSA"),
    hbd: pick(
      raw,
      "hBondDonorCount",
      "hbd",
      "HBondDonorCount",
      "properties.HBondDonorCount",
    ),
    hba: pick(
      raw,
      "hBondAcceptorCount",
      "hba",
      "HBondAcceptorCount",
      "properties.HBondAcceptorCount",
    ),
    rotatable: pick(
      raw,
      "rotatableBondCount",
      "rotatable",
      "RotatableBondCount",
      "properties.RotatableBondCount",
    ),
    heavyAtoms: pick(
      raw,
      "heavyAtomCount",
      "HeavyAtomCount",
      "properties.HeavyAtomCount",
    ),
    complexity: pick(raw, "complexity", "Complexity", "properties.Complexity"),
    charge: pick(raw, "charge", "Charge", "properties.Charge"),
    iupac: pick(raw, "iupacName", "IUPACName", "properties.IUPACName"),
    smiles: pick(
      raw,
      "canonicalSmiles",
      "canonicalSMILES",
      "CanonicalSMILES",
      "ConnectivitySMILES",
      "smiles",
      "properties.CanonicalSMILES",
    ),
    inchiKey: pick(raw, "inchiKey", "InChIKey", "properties.InChIKey"),
  };
}

export async function loadProtein(id) {
  const raw = await getProtein(id);
  if (import.meta.env.DEV) console.debug("[compare] protein raw:", raw);

  const polymers = asArray(
    pick(
      raw,
      "polymers",
      "polymerEntities",
      "polymer_entities",
      "entities.polymers",
    ),
  );
  const ligands = asArray(
    pick(
      raw,
      "ligands",
      "nonpolymers",
      "nonpolymerEntities",
      "nonpolymer_entities",
      "entities.nonpolymers",
    ),
  );

  const organisms = unique(
    polymers
      .map((p) =>
        pick(
          p,
          "organism",
          "organismName",
          "rcsb_entity_source_organism.0.ncbi_scientific_name",
        ),
      )
      .filter(Boolean),
  );
  const topOrganism = pick(raw, "organism", "organismName");
  if (!organisms.length && topOrganism) organisms.push(...asArray(topOrganism));

  const summedResidues = polymers.reduce((sum, p) => {
    const len = toNum(pick(p, "length", "sequenceLength", "sequence_length"));
    const seq = typeof p?.sequence === "string" ? p.sequence.length : 0;
    return sum + (len ?? seq);
  }, 0);

  const uniprot = unique(
    polymers
      .flatMap((p) =>
        asArray(pick(p, "uniprot", "uniprotIds", "uniprot_ids", "uniprotId")),
      )
      .map((u) => (typeof u === "string" ? u : pick(u, "id", "accession")))
      .filter(Boolean),
  );

  const release = pick(
    raw,
    "releaseDate",
    "initialRelease",
    "rcsb_accession_info.initial_release_date",
  );

  return {
    kind: "protein",
    id: String(
      pick(raw, "id", "pdbId", "rcsb_id", "entry.id") ?? id,
    ).toUpperCase(),
    name: pick(raw, "title", "struct.title", "entry.struct.title") ?? id,
    method: pick(
      raw,
      "method",
      "experimentalMethod",
      "rcsb_entry_info.experimental_method",
    ),
    resolution: pick(
      raw,
      "resolution",
      "rcsb_entry_info.resolution_combined.0",
      "resolutionCombined.0",
    ),
    released: release ? String(release).slice(0, 10) : null,
    organism: organisms.join(", ") || null,
    entities: polymers.length || null,
    residues:
      pick(
        raw,
        "residueCount",
        "residues",
        "rcsb_entry_info.deposited_polymer_monomer_count",
      ) ??
      (summedResidues || null),
    ligandCount: ligands.length,
    uniprot: uniprot.join(", ") || null,
  };
}

// ---------- rows for the comparison table ----------
const text = (v) =>
  v === null || v === undefined || v === "" ? null : String(v);

function row(
  key,
  label,
  va,
  vb,
  { mono = false, numeric = false, unit = "" } = {},
) {
  const cell = (v) => {
    const t = text(v);
    return { text: t ? t + unit : null, n: numeric ? toNum(v) : null };
  };
  return { key, label, mono, numeric, a: cell(va), b: cell(vb) };
}

export function ligandRows(a, b) {
  const r = (key, label, opts) => row(key, label, a[key], b[key], opts);
  return [
    r("cid", "CID", { mono: true }),
    r("formula", "Formula"),
    r("weight", "Molecular weight", { numeric: true, unit: " g/mol" }),
    r("exactMass", "Exact mass", { numeric: true }),
    r("xlogp", "XLogP", { numeric: true }),
    r("tpsa", "TPSA", { numeric: true, unit: " Å²" }),
    r("hbd", "H-bond donors", { numeric: true }),
    r("hba", "H-bond acceptors", { numeric: true }),
    r("rotatable", "Rotatable bonds", { numeric: true }),
    r("heavyAtoms", "Heavy atoms", { numeric: true }),
    r("complexity", "Complexity", { numeric: true }),
    r("charge", "Charge", { numeric: true }),
    r("iupac", "IUPAC name"),
    r("smiles", "Canonical SMILES", { mono: true }),
    r("inchiKey", "InChIKey", { mono: true }),
  ];
}

export function proteinRows(a, b) {
  const r = (key, label, opts) => row(key, label, a[key], b[key], opts);
  return [
    r("id", "PDB ID", { mono: true }),
    r("name", "Title"),
    r("method", "Method"),
    r("resolution", "Resolution", { numeric: true, unit: " Å" }),
    r("released", "Released"),
    r("organism", "Organism"),
    r("entities", "Polymer entities", { numeric: true }),
    r("residues", "Residues", { numeric: true }),
    r("ligandCount", "Bound ligands", { numeric: true }),
    r("uniprot", "UniProt", { mono: true }),
  ];
}
