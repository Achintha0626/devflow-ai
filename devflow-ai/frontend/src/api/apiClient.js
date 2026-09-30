/**
 * apiClient.js
 *
 * Centralized Axios instance for all DevFlow AI API requests.
 *
 * Features:
 * - Reads base URL from VITE_API_BASE_URL env var (fallback: http://localhost:5000/api/v1)
 * - Attaches Authorization: Bearer <accessToken> on every request
 * - Intercepts 401 responses: attempts one silent token refresh using
 *   POST /auth/refresh with the stored refreshToken (in request body, per backend contract)
 * - Rotates and saves new tokens returned by /auth/refresh
 * - Retries the original failed request once with the new access token
 * - Prevents infinite refresh loops by flagging requests that are already a retry
 * - Queues concurrent 401 responses so only one refresh call is made at a time
 * - On refresh failure: clears tokens and dispatches a custom event so AuthContext
 *   can react without creating a circular dependency
 * - Skips refresh for auth mutation endpoints (login, register, refresh, logout)
 */

import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from "../utils/tokenStorage";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Attach the current access token to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ─── Token-Refresh State ──────────────────────────────────────────────────────
// isRefreshing prevents multiple simultaneous refresh calls.
// failedQueue holds { resolve, reject } for requests that arrived while a
// refresh was already in progress.
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, accessToken = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(accessToken);
    }
  });
  failedQueue = [];
}

// Auth endpoints that must NEVER trigger a refresh loop.
const AUTH_SKIP_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

function isAuthEndpoint(config) {
  return AUTH_SKIP_PATHS.some((path) =>
    (config.url || "").includes(path)
  );
}

// ─── Response Interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401 errors that are not already a retry and not auth endpoints.
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest)
    ) {
      const storedRefreshToken = getRefreshToken();

      // If we have no refresh token at all, bail out immediately.
      if (!storedRefreshToken) {
        clearTokens();
        window.dispatchEvent(new CustomEvent("devflow:auth:expired"));
        return Promise.reject(error);
      }

      // If a refresh is already in progress, queue this request.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newAccessToken) => {
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        });
      }

      // Mark as retry so we do not loop if /auth/refresh itself returns 401.
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call /auth/refresh with the refresh token in the request body —
        // this is the exact contract expected by the backend.
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data.data;

        saveTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear everything and notify the app.
        processQueue(refreshError, null);
        clearTokens();
        window.dispatchEvent(new CustomEvent("devflow:auth:expired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
