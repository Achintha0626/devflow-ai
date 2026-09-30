/**
 * tokenStorage.js
 *
 * Centralized token storage utility.
 *
 * ARCHITECTURE NOTE:
 * The current backend contract (POST /auth/refresh) expects the refresh token
 * sent as { refreshToken } in the JSON request body. This means the refresh
 * token must be readable by JavaScript, so we store it in localStorage.
 *
 * This is a deliberate trade-off to match the existing backend API exactly.
 * A future migration path would be:
 *   1. Update the backend to set the refresh token in an HttpOnly Secure
 *      SameSite=Strict cookie (never readable by JS).
 *   2. Update the /auth/refresh endpoint to read from the cookie instead of
 *      the request body.
 *   3. Remove the refresh token from localStorage entirely.
 *
 * Until that migration happens, ALL localStorage read/write for tokens must
 * go through this module — never directly inside components or other utilities.
 */

const ACCESS_TOKEN_KEY = "devflow_access_token";
const REFRESH_TOKEN_KEY = "devflow_refresh_token";

export function saveTokens(accessToken, refreshToken) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasTokens() {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}
