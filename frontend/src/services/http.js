export class ApiError extends Error {
  constructor(message, { status = 0, kind = "unknown" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind; // 'not-found' | 'network' | 'server' | 'unknown'
  }
}

export async function fetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err.name === "AbortError") throw err; // caller cancelled, not a real error
    throw new ApiError("Could not reach the server. Check your connection.", {
      kind: "network",
    });
  }

  if (res.status === 204) return null; // RCSB search: no results
  if (res.status === 404 || res.status === 400) {
    throw new ApiError("Nothing found for that search.", {
      status: res.status,
      kind: "not-found",
    });
  }
  if (!res.ok) {
    throw new ApiError(
      res.status >= 500
        ? "The service is busy right now. Try again in a moment."
        : `Request failed (${res.status}).`,
      { status: res.status, kind: res.status >= 500 ? "server" : "unknown" },
    );
  }
  return res.json();
}

// For secondary data: if it fails, the page should still render.
export async function optional(promise) {
  try {
    return await promise;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return null;
  }
}
