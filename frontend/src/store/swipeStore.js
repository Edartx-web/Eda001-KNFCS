/**
 * swipeStore — module-level list of item slugs for ProductDetailPage swipe navigation.
 * ProductListPage writes to this whenever items change.
 * ProductDetailPage reads from it to find prev/next item slugs.
 * Falls back to sessionStorage so a direct page-load can still navigate.
 */

const SS_KEY = "knfc_swipe_list";

let _list = [];

export function setSwipeList(items) {
  _list = items.map(i => ({ slug: i.slug, name: i.name }));
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(_list)); } catch {}
}

export function getSwipeList() {
  if (_list.length) return _list;
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) || "[]"); } catch { return []; }
}
