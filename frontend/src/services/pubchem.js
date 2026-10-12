import { ApiError, fetchJson } from "./http";

const BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

const PROPERTIES = [
  "Title",
  "MolecularFormula",
  "MolecularWeight",
  "ExactMass",
  "IUPACName",
  "ConnectivitySMILES",
  "SMILES",
  "InChI",
  "InChIKey",
  "XLogP",
  "TPSA",
  "Complexity",
  "Charge",
  "HBondDonorCount",
  "HBondAcceptorCount",
  "RotatableBondCount",
  "HeavyAtomCount",
].join(",");

// Numbers are treated as CIDs, anything else as a compound name.
export async function resolveCid(query, signal) {
  const q = query.trim();
  if (/^\d+$/.test(q)) return Number(q);

  const data = await fetchJson(
    `${BASE}/compound/name/${encodeURIComponent(q)}/cids/JSON`,
    { signal },
  );
  const cid = data?.IdentifierList?.CID?.[0];
  if (!cid)
    throw new ApiError("No compound found.", {
      status: 404,
      kind: "not-found",
    });
  return cid;
}

// Synonyms are a bonus: if they fail, the page should still render.
async function optional(promise) {
  try {
    return await promise;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return null;
  }
}

export async function getCompound(query, signal) {
  const cid = await resolveCid(query, signal);

  const [propData, synData] = await Promise.all([
    fetchJson(`${BASE}/compound/cid/${cid}/property/${PROPERTIES}/JSON`, {
      signal,
    }),
    optional(
      fetchJson(`${BASE}/compound/cid/${cid}/synonyms/JSON`, { signal }),
    ),
  ]);

  const p = propData?.PropertyTable?.Properties?.[0];
  if (!p)
    throw new ApiError("No compound found.", {
      status: 404,
      kind: "not-found",
    });

  return {
    cid,
    title: p.Title ?? `CID ${cid}`,
    formula: p.MolecularFormula,
    weight: p.MolecularWeight,
    exactMass: p.ExactMass,
    iupacName: p.IUPACName,
    // PubChem renamed these fields; the fallbacks cover the old names
    canonicalSmiles: p.ConnectivitySMILES ?? p.CanonicalSMILES,
    isomericSmiles: p.SMILES ?? p.IsomericSMILES,
    inchi: p.InChI,
    inchiKey: p.InChIKey,
    xlogp: p.XLogP,
    tpsa: p.TPSA,
    complexity: p.Complexity,
    charge: p.Charge,
    hbd: p.HBondDonorCount,
    hba: p.HBondAcceptorCount,
    rotatableBonds: p.RotatableBondCount,
    heavyAtoms: p.HeavyAtomCount,
    synonyms: synData?.InformationList?.Information?.[0]?.Synonym ?? [],
  };
}

// URLs the browser can use directly (no fetch needed)
export const imageUrl = (cid, size = 500) =>
  `${BASE}/compound/cid/${cid}/PNG?image_size=${size}x${size}`;

export const sdfDownloadUrl = (cid) =>
  `${BASE}/compound/cid/${cid}/SDF?response_type=save&response_basename=compound_${cid}`;

export const pubchemPageUrl = (cid) =>
  `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
