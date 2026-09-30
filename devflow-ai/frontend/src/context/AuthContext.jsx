/**
 * AuthContext.jsx
 *
 * Exports only the AuthProvider component.
 * The AuthContext object lives in authContext.js so this file
 * satisfies the react-refresh/only-export-components ESLint rule.
 *
 * On mount:
 *   1. If an access token exists in storage, call GET /auth/me to validate
 *      it and restore the user session. The Axios interceptor will
 *      transparently handle an expired access token by refreshing it first.
 *   2. If /auth/me fails (both tokens are invalid), clear stale data and
 *      render as unauthenticated.
 *   3. If no token exists at all, render immediately as unauthenticated.
 *
 * AuthContext value:
 *   user            — the current user object or null
 *   isAuthenticated — boolean derived from user != null
 *   isLoading       — true while session restore is in progress
 *   login(email, password)
 *   register(firstName, lastName, email, password)  — registers then auto-logs-in
 *   logout()
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContext } from "./authContext";
import {
  getMeRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
} from "../api/authApi";
import {
  clearTokens,
  getRefreshToken,
  hasTokens,
  saveTokens,
} from "../utils/tokenStorage";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Prevent double-initialisation in React StrictMode dev double-invoke.
  const initialised = useRef(false);

  // ─── Session Restore ────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    async function restoreSession() {
      if (!hasTokens()) {
        setIsLoading(false);
        return;
      }

      try {
        // The Axios interceptor silently refreshes an expired access token
        // before this request completes.
        const response = await getMeRequest();
        setUser(response.data);
      } catch {
        // Both tokens invalid or server unreachable — clear stale data.
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // ─── Handle externally-triggered auth expiry ────────────────────────────────
  // The Axios interceptor dispatches this event when a mid-session refresh fails.
  useEffect(() => {
    function handleExpired() {
      clearTokens();
      setUser(null);
    }
    window.addEventListener("devflow:auth:expired", handleExpired);
    return () => window.removeEventListener("devflow:auth:expired", handleExpired);
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    const response = await loginRequest({ email, password });
    const { user: loggedInUser, accessToken, refreshToken } = response.data;
    saveTokens(accessToken, refreshToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  /**
   * Register then immediately auto-log-in with the same credentials.
   * Backend POST /auth/register returns the user but no tokens, so we
   * follow it with POST /auth/login.
   *
   * On auto-login failure: clears state and throws AUTO_LOGIN_FAILED
   * so the caller (RegisterPage) can redirect to /login safely.
   */
  const register = useCallback(async (firstName, lastName, email, password) => {
    // Step 1: create the account.
    await registerRequest({ firstName, lastName, email, password });

    // Step 2: immediately log in with the same credentials.
    try {
      const loginResponse = await loginRequest({ email, password });
      const { user: loggedInUser, accessToken, refreshToken } = loginResponse.data;
      saveTokens(accessToken, refreshToken);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (loginError) {
      clearTokens();
      setUser(null);
      const err = new Error("AUTO_LOGIN_FAILED");
      err.cause = loginError;
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    clearTokens();
    setUser(null);

    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // Intentionally swallowed — local logout already happened.
      }
    }
  }, []);

  const value = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
