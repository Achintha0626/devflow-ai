/**
 * errorUtils.js
 *
 * Normalizes Axios/API errors into a human-readable message string.
 * The backend returns errors in the shape: { success: false, message: "..." }
 *
 * We surface the server message directly when available so users see
 * messages like "Invalid email or password" rather than generic fallbacks.
 * Internal stack traces are never exposed.
 */

/**
 * Extract a display-safe error message from an Axios error or any thrown value.
 * @param {unknown} error
 * @param {string} [fallback] - Fallback message when nothing more specific is available.
 * @returns {string}
 */
export function getErrorMessage(error, fallback = "An unexpected error occurred. Please try again.") {
  if (!error) return fallback;

  // Axios error with a backend response body
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Axios network error (no response received)
  if (error.request && !error.response) {
    return "Unable to reach the server. Please check your connection.";
  }

  // Plain Error object
  if (error instanceof Error) {
    return error.message || fallback;
  }

  // String thrown directly
  if (typeof error === "string") {
    return error;
  }

  return fallback;
}
