import { api } from "./api.js";

export const register = (name, email, password) =>
  api("/auth/register", { method: "POST", body: { name, email, password } });

export const login = (email, password) =>
  api("/auth/login", { method: "POST", body: { email, password } });

export const logout = () => api("/auth/logout", { method: "POST" });

// Resolves to the signed-in user, or null if there is no valid session
export async function getMe(signal) {
  const data = await api("/auth/me", { signal });
  return data.user;
}
