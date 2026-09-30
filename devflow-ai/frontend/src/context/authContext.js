/**
 * authContext.js
 *
 * Exports only the AuthContext object.
 * Kept in a plain .js file (no JSX, no component) so AuthContext.jsx
 * can export only the AuthProvider component and satisfy the
 * react-refresh/only-export-components ESLint rule.
 */

import { createContext } from "react";

export const AuthContext = createContext(null);
