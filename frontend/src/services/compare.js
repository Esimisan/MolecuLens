import { getCompound } from "./pubchem";
import { getProtein, prettyMethod } from "./rcsb";

// ---------- helpers ----------
const unique = (arr) => [...new Set(arr.filter(Boolean))];
const toNum = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ---------- loaders ----------
export async function loadLigand(query, signal) {
  const c = await getCompound(query, signal);
  return {
    kind: "ligand",
    cid: c.cid,
    name: c.title,
    formula: c.formula,
    weight: c.weight,
    exactMass: c.exactMass,
    xlogp: c.xlogp,
    tpsa: c.tpsa,
    hbd: c.hbd,
    hba: c.hba,
    rotatableBonds: c.rotatableBonds,
    heavyAtoms: c.heavyAtoms,
    complexity: c.complexity,
    charge: c.charge,
    iupac: c.iupacName,
    smiles: c.canonicalSmiles,
    isomericSmiles: c.isomericSmiles,
    inchiKey: c.inchiKey,
  };
}

export async function loadProtein(id, signal) {
  const p = await getProtein(id, signal);
  const polymers = p.polymers ?? [];
  return {
    kind: "protein",
    id: p.id,
    name: p.title ?? p.id,
    method: p.method ? prettyMethod(p.method) : null,
    resolution: p.resolution,
    released: p.releaseDate,
    organism:
      unique(polymers.flatMap((x) => x.organisms ?? [])).join(", ") || null,
    entities: p.polymerEntityCount || polymers.length || null,
    residues: p.residueCount,
    weightKda: p.weightKda,
    ligandCount: p.nonpolymerEntityCount ?? p.nonpolymers?.length ?? 0,
    uniprot:
      unique(polymers.flatMap((x) => x.uniprotIds ?? [])).join(", ") || null,
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
    r("rotatableBonds", "Rotatable bonds", { numeric: true }),
    r("heavyAtoms", "Heavy atoms", { numeric: true }),
    r("complexity", "Complexity", { numeric: true }),
    r("charge", "Charge", { numeric: true }),
    r("iupac", "IUPAC name"),
    r("smiles", "Canonical SMILES", { mono: true }),
    r("isomericSmiles", "Isomeric SMILES", { mono: true }),
    r("inchiKey", "InChIKey", { mono: true }),
  ];
}

export function proteinRows(a, b) {
  const r = (key, label, opts) => row(key, label, a[key], b[key], opts);
  return [
    r("id", "PDB ID", { mono: true }),
    r("method", "Method"),
    r("resolution", "Resolution", { numeric: true, unit: " Å" }),
    r("released", "Released"),
    r("organism", "Organism"),
    r("entities", "Polymer entities", { numeric: true }),
    r("residues", "Residues", { numeric: true }),
    r("weightKda", "Mass", { numeric: true, unit: " kDa" }),
    r("ligandCount", "Bound ligands", { numeric: true }),
    r("uniprot", "UniProt", { mono: true }),
  ];
}
