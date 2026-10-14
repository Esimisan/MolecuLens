export class ApiError extends Error {
  constructor(message, { status = 0, kind = "unknown" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind; // 'not-found' | 'network' | 'server' | 'unknown'
  }
}

/* ------------------------------------------------------------------ *
 * Shared request layer: throttle (PubChem), retry with backoff, cache.
 * ------------------------------------------------------------------ */

const PUBCHEM_HOST = "pubchem.ncbi.nlm.nih.gov";
const PUBCHEM_GAP_MS = 300; // ~3 requests/second, under PubChem's 5/s limit
const RETRY_STATUS = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3; // waits roughly 1s, 2s, 4s
const BASE_DELAY_MS = 1000;
const CACHE_LIMIT = 200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const abortError = () => new DOMException("Aborted", "AbortError");

// Space out request starts to PubChem so bursts don't trigger 503s.
let nextSlot = 0;
async function waitForSlot(url) {
  if (!url.includes(PUBCHEM_HOST)) return;
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + PUBCHEM_GAP_MS;
  if (start > now) await sleep(start - now);
}

function retryDelay(res, attempt) {
  const header = Number(res.headers.get("Retry-After"));
  if (header > 0) return Math.min(header, 10) * 1000;
  return BASE_DELAY_MS * 2 ** attempt + Math.random() * 250;
}

// Returns a Response; retries "busy" statuses and one network failure.
async function request(url, init) {
  const signal = init.signal;
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw abortError();
    await waitForSlot(url);
    if (signal?.aborted) throw abortError();

    let res;
    try {
      res = await fetch(url, init);
    } catch (err) {
      if (err.name === "AbortError") throw err; // caller cancelled
      if (attempt >= 1) {
        throw new ApiError(
          "Could not reach the server. Check your connection.",
          { kind: "network" },
        );
      }
      await sleep(BASE_DELAY_MS);
      continue;
    }

    if (RETRY_STATUS.has(res.status) && attempt < MAX_RETRIES) {
      await sleep(retryDelay(res, attempt));
      continue;
    }
    return res;
  }
}

async function load(url, init, parse) {
  const res = await request(url, init);

  if (res.status === 204) return null; // RCSB search: no results
  if (res.status === 404 || res.status === 400) {
    throw new ApiError("Nothing found for that search.", {
      status: res.status,
      kind: "not-found",
    });
  }
  if (!res.ok) {
    const busy = res.status >= 500 || res.status === 429;
    throw new ApiError(
      busy
        ? "The service is busy right now. Try again in a moment."
        : `Request failed (${res.status}).`,
      { status: res.status, kind: busy ? "server" : "unknown" },
    );
  }
  return parse(res);
}

// Each caller gets its own abort, but the shared request keeps running so
// React StrictMode's double effect (and Compare) reuse it instead of failing.
function withSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

// In-memory cache of successful GET responses (failures are never kept).
const cache = new Map();

function cached(kind, url, options, parse) {
  const { signal, ...init } = options;
  const method = (init.method || "GET").toUpperCase();

  // POSTs (e.g. RCSB GraphQL) are retried but not cached.
  if (method !== "GET") return load(url, { ...init, signal }, parse);

  const key = `${kind}:${url}`;
  let shared = cache.get(key);
  if (!shared) {
    shared = load(url, init, parse);
    cache.set(key, shared);
    shared.catch(() => cache.delete(key));
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  }
  return withSignal(shared, signal);
}

export const fetchJson = (url, options = {}) =>
  cached("json", url, options, (res) => res.json());

export const fetchText = (url, options = {}) =>
  cached("text", url, options, (res) => res.text());

// For secondary data: if it fails, the page should still render.
export async function optional(promise) {
  try {
    return await promise;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return null;
  }
}
