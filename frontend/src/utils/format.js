/**
 * utils/format.js
 */
export const formatPrice = n =>
  `₹${Number(n).toLocaleString("en-IN")}`;

export const formatTime = iso => {
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
};

export const formatDate = iso => {
  const d = new Date(iso);
  const today = new Date();
  const diff  = today.setHours(0,0,0,0) - new Date(iso).setHours(0,0,0,0);
  if (diff === 0) return "Today";
  if (diff === 86400000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const formatCountdown = secs => ({
  h: String(Math.floor(secs / 3600)).padStart(2, "0"),
  m: String(Math.floor((secs % 3600) / 60)).padStart(2, "0"),
  s: String(secs % 60).padStart(2, "0"),
});

export const calcSavings = (orig, offer) =>
  orig && offer ? Number(orig) - Number(offer) : 0;

export const truncate = (str, n = 60) =>
  str && str.length > n ? str.slice(0, n) + "…" : str;

/**
 * Format measurement unit + quantity into a clean display string.
 * e.g. (500, "g") → "500g"    (1, "kg") → "1kg"
 *      (6, "pcs") → "6 pcs"  (250, "ml") → "250ml"
 *      (null, "pcs") → ""     (null, null) → ""
 */
export function formatUnit(unitQuantity, measurementUnit) {
  if (!measurementUnit || measurementUnit === "pcs") {
    if (!unitQuantity) return "";
    return `${unitQuantity} pcs`;
  }
  const UNIT_LABELS = {
    g:       "g",
    kg:      "kg",
    ml:      "ml",
    l:       "L",
    portion: "portion",
    box:     "box",
    cup:     "cup",
    pcs:     "pcs",
  };
  const label = UNIT_LABELS[measurementUnit] || measurementUnit;
  if (!unitQuantity) return label;
  return `${unitQuantity}${label}`;
}

/** Returns null if calories is falsy/zero — never show "0 kcal" */
export function formatCalories(calories) {
  const n = parseInt(calories);
  if (!n || n <= 0) return null;
  return `${n} kcal`;
}
