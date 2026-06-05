/**
 * patch.mjs — Re-applies the lid-mapping.js null-guard fix after npm install.
 *
 * Root cause: @innovatorssoft/baileys lib/Signal/lid-mapping.js line ~113
 * destructs the result of onWhatsAppFunc?.(pn)?.[0] without guarding against
 * undefined, crashing when WhatsApp sends messages over LID routing.
 *
 * Run automatically via package.json "postinstall".
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(
  __dirname,
  "node_modules/@innovatorssoft/baileys/lib/Signal/lid-mapping.js"
);

if (!fs.existsSync(target)) {
  console.log("[patch] lid-mapping.js not found — skipping.");
  process.exit(0);
}

const original = fs.readFileSync(target, "utf8");

const NEEDLE = `const { exists, lid } = (await this.onWhatsAppFunc?.(pn))?.[0] // this function already adds LIDs to mapping`;
const REPLACEMENT = `// Guard: onWhatsAppFunc may return undefined or empty array — destructuring undefined throws
                const _usyncEntry = (await this.onWhatsAppFunc?.(pn))?.[0]
                if (!_usyncEntry) return null
                const { exists, lid } = _usyncEntry`;

if (original.includes(NEEDLE)) {
  const patched = original.replace(NEEDLE, REPLACEMENT);
  fs.writeFileSync(target, patched, "utf8");
  console.log("[patch] lid-mapping.js patched successfully.");
} else if (original.includes("_usyncEntry")) {
  console.log("[patch] lid-mapping.js already patched — nothing to do.");
} else {
  console.warn("[patch] Could not locate patch target in lid-mapping.js — manual check needed.");
}
