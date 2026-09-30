/**
 * authApi.js
 *
 * Thin wrappers around the backend authentication endpoints.
 * All functions return the full response data payload (response.data).
 */

import apiClient from "./apiClient";

/**
 * POST /auth/register
 * Body: { firstName, lastName, email, password }
 * Response: { success, message, data: user }
 *
 * NOTE: Registration does NOT return tokens — the backend only creates the
 * user account. Redirect to login after successful registration.
 */
export async function registerRequest({ firstName, lastName, email, password }) {
  const response = await apiClient.post("/auth/register", {
    firstName,
    lastName,
    email,
    password,
  });
  return response.data;
}

/**
 * POST /auth/login
 * Body: { email, password }
 * Response: { success, message, data: { user, accessToken, refreshToken } }
 */
export async function loginRequest({ email, password }) {
  const response = await apiClient.post("/auth/login", { email, password });
  return response.data;
}

/**
 * POST /auth/refresh
 * Body: { refreshToken }
 * Response: { success, data: { accessToken, refreshToken } }
 *
 * This is called automatically by the Axios interceptor; call it directly
 * only if you have a very specific need to refresh outside the interceptor.
 */
export async function refreshRequest(refreshToken) {
  const response = await apiClient.post("/auth/refresh", { refreshToken });
  return response.data;
}

/**
 * GET /auth/me
 * Header: Authorization: Bearer <accessToken>
 * Response: { success, data: user }
 */
export async function getMeRequest() {
  const response = await apiClient.get("/auth/me");
  return response.data;
}

/**
 * POST /auth/logout
 * Body: { refreshToken }
 * Response: { success, message }
 *
 * The backend revokes the refresh token. Always clear local tokens after
 * calling this, regardless of whether the server call succeeds.
 */
export async function logoutRequest(refreshToken) {
  const response = await apiClient.post("/auth/logout", { refreshToken });
  return response.data;
}
