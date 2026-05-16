/**
 * context/AuthContext.jsx
 *
 * Global auth + branch state.
 *
 * Branch selection (customers):
 *   selectedBranch  — full branch object { id, name, address, ... } | null
 *   selectBranch(b) — saves to localStorage + cartStore
 *   clearBranch()   — clears selection (e.g. on logout)
 *
 * Auth (all roles):
 *   login(userData, tokens)
 *   loginWithApi(role, creds)
 *   logout()
 */

import React, {
  createContext, useContext,
  useState, useEffect, useCallback,
} from "react";
import { clearAuthTokens } from "../api/axiosClient";
import {
  staffLogin  as apiStaffLogin,
  adminLogin  as apiAdminLogin,
  refreshJwt,
} from "../api/auth";

const AuthContext = createContext(null);

const BRANCH_KEY = "knfc_selected_branch";

export function AuthProvider({ children }) {
  const [user,           setUser]          = useState(null);
  const [isLoading,      setLoading]       = useState(true);
  const [selectedBranch, setSelectedBranch]= useState(null);

  /* ── Restore session ─────────────────────────────────────────────── */
  useEffect(() => {
    const storedUser   = localStorage.getItem("user");
    const accessToken  = localStorage.getItem("access_token");
    const storedBranch = localStorage.getItem(BRANCH_KEY);

    if (storedUser && accessToken) {
      try { setUser(JSON.parse(storedUser)); } catch { clearAuthTokens(); }
    }
    if (storedBranch) {
      try {
        const branch = JSON.parse(storedBranch);
        setSelectedBranch(branch);
        if (branch?.id) localStorage.setItem("branch_id", branch.id);
      } catch {}
    }
    setLoading(false);
  }, []);

  /* ── Persist tokens + user ───────────────────────────────────────── */
  const _persist = useCallback((userData, tokens) => {
    if (tokens?.access)  localStorage.setItem("access_token",  tokens.access);
    if (tokens?.refresh) localStorage.setItem("refresh_token", tokens.refresh);
    localStorage.setItem("user", JSON.stringify(userData));
    // Staff / Admin: their branch_id comes from JWT — store for API calls
    if (userData.branch_id) {
      localStorage.setItem("branch_id", userData.branch_id);
    }
    setUser(userData);
  }, []);

  /* ── Branch selection (customers) ────────────────────────────────── */
  const selectBranch = useCallback((branch) => {
    setSelectedBranch(branch);
    localStorage.setItem(BRANCH_KEY,  JSON.stringify(branch));
    localStorage.setItem("branch_id", branch.id);  // used by all API BID() helpers
    // Sync cartStore so buildOrderPayload always has branch_id
    try {
      const { default: useCartStore } = require("../store/cartStore");
      useCartStore.getState().setBranch(branch.id);
    } catch {}
    // Reload so all menu/offer/config fetches re-run with the new branch context
    window.location.reload();
  }, []);

  const clearBranch = useCallback(() => {
    setSelectedBranch(null);
    localStorage.removeItem(BRANCH_KEY);
    localStorage.removeItem("branch_id");
  }, []);

  /* ── login ───────────────────────────────────────────────────────── */
  const login = useCallback((userData, tokens) => {
    _persist(userData, tokens);
  }, [_persist]);

  /* ── loginWithApi ────────────────────────────────────────────────── */
  const loginWithApi = useCallback(async (role, credentials) => {
    if (role === "customer") {
      throw new Error("Use customerVerifyOtp directly for customers.");
    }
    let data;
    if (role === "staff") {
      const res = await apiStaffLogin(credentials.user_id, credentials.password);
      data = res.data;
    } else {
      const res = await apiAdminLogin(credentials.email, credentials.password);
      data = res.data;
      if (role !== data.user.role) {
        throw new Error(
          `This account is a ${data.user.role.replace("_"," ")}, not a ${role.replace("_"," ")}.`
        );
      }
    }
    _persist(data.user, data.tokens);
    return data.user;
  }, [_persist]);

  /* ── logout ──────────────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    // Tell backend to flip is_on_duty=False for staff/branch_admin
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL || "/api/v1"}/auth/logout/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }
    } catch { /* best-effort — proceed with local logout regardless */ }
    clearAuthTokens();
    localStorage.removeItem("branch_id");
    localStorage.removeItem("active_order");
    localStorage.removeItem(BRANCH_KEY);
    setSelectedBranch(null);
    setUser(null);
  }, []);

  /* ── refreshSession ──────────────────────────────────────────────── */
  const refreshSession = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return false;
    try {
      const res = await refreshJwt(refresh);
      localStorage.setItem("access_token", res.data.access);
      return true;
    } catch {
      logout();
      return false;
    }
  }, [logout]);

  const role           = user?.role ?? null;
  const isCustomer     = role === "customer";
  const isStaff        = role === "staff";
  const isBranchAdmin  = role === "branch_admin";
  const isSuperAdmin   = role === "super_admin";
  const isAdminOrAbove = isBranchAdmin || isSuperAdmin;
  const isAuthenticated= Boolean(user);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated,
      role, isCustomer, isStaff, isBranchAdmin, isSuperAdmin, isAdminOrAbove,
      selectedBranch, selectBranch, clearBranch,
      login, loginWithApi, logout, refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
