import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext.js";
import * as authService from "../services/auth.js";

//When someone signs up, greet them with ‘Welcome, Ada.’ If they’re returning, greet them with ‘Welcome back, Ada.’ We use sessionStorage to keep track of this during a refresh, but it resets when they start a new visit

const GREETING_KEY = "moleculens.greeting";

function readGreetingKind() {
  try {
    return sessionStorage.getItem(GREETING_KEY) === "new" ? "new" : "back";
  } catch {
    return "back";
  }
}

function writeGreetingKind(kind) {
  try {
    if (kind) sessionStorage.setItem(GREETING_KEY, kind);
    else sessionStorage.removeItem(GREETING_KEY);
  } catch {
    /* storage unavailable: falls back to "back" */
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // 'loading' | 'ready'
  const [greetingKind, setGreetingKind] = useState("back");

  // On app start, ask the server who we are
  useEffect(() => {
    const controller = new AbortController();
    authService
      .getMe(controller.signal)
      .then((me) => {
        setUser(me);
        if (me) setGreetingKind(readGreetingKind());
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setUser(null); // server down or not logged in: treat as logged out
        setStatus("ready");
      });
    return () => controller.abort();
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { user: me } = await authService.register(name, email, password);
    writeGreetingKind("new");
    setGreetingKind("new");
    setUser(me);
    return me;
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: me } = await authService.login(email, password);
    writeGreetingKind("back");
    setGreetingKind("back");
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      writeGreetingKind(null);
      setGreetingKind("back");
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      greeting: user
        ? greetingKind === "new"
          ? `Welcome, ${user.name}`
          : `Welcome back, ${user.name}`
        : null,
      register,
      login,
      logout,
    }),
    [user, status, greetingKind, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
