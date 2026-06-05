/**
 * hooks/useBranch.js
 *
 * Convenience hook wrapping AuthContext's branch state.
 * Used everywhere branch context is needed.
 *
 * Returns:
 *   branchId         — current branch UUID | null
 *   branchName       — current branch name | ""
 *   selectedBranch   — full branch object | null
 *   hasBranch        — boolean
 *   selectBranch(b)  — set branch + persist
 *   clearBranch()    — remove branch
 */

import { useAuth } from "../context/AuthContext";

export default function useBranch() {
  const {
    selectedBranch, selectBranch, clearBranch,
    suggestedBranch, dismissBranchSuggestion,
    isLoading: authLoading,
  } = useAuth();

  return {
    selectedBranch,
    branchId:    selectedBranch?.id   || null,
    branchName:  selectedBranch?.name || "",
    hasBranch:   Boolean(selectedBranch?.id),
    authLoading,   // true while AuthContext is still detecting the branch
    selectBranch,
    clearBranch,
    suggestedBranch,
    dismissBranchSuggestion,
  };
}
