/**
 * usePageProtection
 *
 * Applies security restrictions on sensitive pages (payment, privacy).
 *
 * What it blocks:
 *  • Right-click context menu
 *  • Text selection  (CSS user-select: none)
 *  • Copy / Cut clipboard events
 *  • Ctrl+C, Ctrl+A, Ctrl+P (print), Ctrl+S (save), Ctrl+U (source), Ctrl+Shift+I/J (devtools)
 *  • PrintScreen key (browser-level only — OS-level screenshots cannot be blocked)
 *  • window.print() / browser print dialog
 *  • Drag-select on images
 *
 * Note: OS-level screenshots (Power+Volume, Snipping Tool, screen recorder) cannot
 * be blocked by any browser API. The protections here raise the bar without
 * breaking legitimate UI interactions (scrolling, clicking, form input).
 */

import { useEffect } from "react";

export default function usePageProtection({
  blockCopy        = true,
  blockContextMenu = true,
  blockPrint       = true,
} = {}) {
  useEffect(() => {
    // ── CSS: disable selection across the whole document ────────────────
    const prevSelect = document.body.style.userSelect;
    const prevWebkit = document.body.style.webkitUserSelect;
    if (blockCopy) {
      document.body.style.userSelect       = "none";
      document.body.style.webkitUserSelect = "none";
    }

    // ── Keyboard shortcuts ───────────────────────────────────────────────
    const BLOCKED_KEYS = new Set(["c", "a", "p", "s", "u"]);
    const BLOCKED_SHIFT_KEYS = new Set(["i", "j", "c"]); // devtools

    const onKeyDown = (e) => {
      if (blockCopy) {
        // Ctrl/Cmd + blocked letter
        if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // Ctrl+Shift+I / J / C (devtools)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && BLOCKED_SHIFT_KEYS.has(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // F12 devtools, PrintScreen
        if (e.key === "F12" || e.key === "PrintScreen") {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // ── Clipboard events ─────────────────────────────────────────────────
    const onClipboard = (e) => {
      if (blockCopy) e.preventDefault();
    };

    // ── Context menu ─────────────────────────────────────────────────────
    const onContextMenu = (e) => {
      if (blockContextMenu) e.preventDefault();
    };

    // ── Print ─────────────────────────────────────────────────────────────
    const onBeforePrint = () => {
      if (blockPrint) {
        document.body.style.display = "none";
        setTimeout(() => { document.body.style.display = ""; }, 100);
      }
    };
    // Override window.print to be a no-op
    const origPrint = window.print.bind(window);
    if (blockPrint) {
      window.print = () => {};
    }

    // ── Drag on images ────────────────────────────────────────────────────
    const onDragStart = (e) => {
      if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") {
        e.preventDefault();
      }
    };

    // ── Register ─────────────────────────────────────────────────────────
    document.addEventListener("keydown",     onKeyDown,     { capture: true });
    document.addEventListener("copy",        onClipboard,   { capture: true });
    document.addEventListener("cut",         onClipboard,   { capture: true });
    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("dragstart",   onDragStart,   { capture: true });
    window.addEventListener("beforeprint",   onBeforePrint);

    return () => {
      // Restore
      document.body.style.userSelect       = prevSelect;
      document.body.style.webkitUserSelect = prevWebkit;
      if (blockPrint) window.print = origPrint;

      document.removeEventListener("keydown",     onKeyDown,     { capture: true });
      document.removeEventListener("copy",        onClipboard,   { capture: true });
      document.removeEventListener("cut",         onClipboard,   { capture: true });
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
      document.removeEventListener("dragstart",   onDragStart,   { capture: true });
      window.removeEventListener("beforeprint",   onBeforePrint);
    };
  }, [blockCopy, blockContextMenu, blockPrint]);
}
