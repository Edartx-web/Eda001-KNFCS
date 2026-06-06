/**
 * useSEO — dynamic per-page title + meta description updater.
 *
 * Usage:
 *   useSEO({ title: "Menu — KNFC Fried Chicken", description: "Browse our full menu..." });
 *
 * Sets document.title and updates the canonical <meta name="description"> tag.
 * Restores to the default on unmount.
 */

import { useEffect } from "react";

const SITE_NAME   = "KNFC Fried Chicken";
const DEFAULT_TITLE = `${SITE_NAME} — Fresh, Crispy & Delivered Hot`;
const DEFAULT_DESC  = "India's crispiest fried chicken. Order online for delivery, takeaway or dine-in.";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOG(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function useSEO({ title, description, image, noIndex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const desc      = description || DEFAULT_DESC;

    document.title = fullTitle;
    setMeta("description", desc);
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");

    setOG("og:title",       fullTitle);
    setOG("og:description", desc);
    if (image) setOG("og:image", image);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta("description", DEFAULT_DESC);
      setMeta("robots", "index, follow");
      setOG("og:title",       DEFAULT_TITLE);
      setOG("og:description", DEFAULT_DESC);
    };
  }, [title, description, image, noIndex]);
}
