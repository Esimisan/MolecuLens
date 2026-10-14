export class AuthApiError extends Error {
  constructor(message, { status = 0, fields = {}, kind = "server" } = {}) {
    super(message);
    this.name = "AuthApiError";
    this.status = status; // HTTP status, 0 if the server could not be reached
    this.fields = fields; // per-field messages, e.g. { email: '...' }
    this.kind = kind; // 'network' | 'unauthorized' | 'validation' | 'server'
  }
}

export async function api(path, { method = "GET", body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin", // sends the session cookie
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new AuthApiError(
      "Cannot reach the MolecuLens server. Check that it is running.",
      {
        kind: "network",
      },
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (!res.ok) {
    const kind =
      res.status === 401
        ? "unauthorized"
        : res.status >= 500
          ? "server"
          : "validation";
    throw new AuthApiError(data?.error || `Request failed (${res.status}).`, {
      status: res.status,
      fields: data?.fields || {},
      kind,
    });
  }
  return data;
}
