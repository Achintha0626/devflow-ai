/**
 * useAuth.js
 *
 * Convenience hook for consuming AuthContext.
 * Throws a clear error if used outside of <AuthProvider>.
 */

import { useContext } from "react";
import { AuthContext } from "../context/authContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return context;
}
