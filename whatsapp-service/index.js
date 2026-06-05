/**
 * whatsapp-service/index.js
 * Baileys-based WhatsApp service for KNFC.
 *
 * Two sessions:
 *   otp       — sends 6-digit OTP messages with "Copy Code" button
 *   broadcast — sends offer images + captions with "Order Now" CTA button
 *
 * REST API (all require X-Internal-Key header):
 *   GET  /health
 *   GET  /status
 *   POST /logout/:session
 *   POST /send-otp         { phone, otp, expiry_minutes }
 *   POST /send-message     { phone, text, image_url?, caption?, button_url?, button_text? }
 *
 * WebSocket:
 *   Pushes { type:'state', data:{ otp:{...}, broadcast:{...} } } on any change.
 *   Frontend connects here for real-time QR + status updates.
 */

import baileysPkg from "@innovatorssoft/baileys";
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = baileysPkg;
import { Boom }            from "@hapi/boom";
import express             from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer }    from "http";
import QRCode              from "qrcode";
import pino                from "pino";
import fs                  from "fs";
import path                from "path";
import { fileURLToPath }   from "url";

const __dirname     = path.dirname(fileURLToPath(import.meta.url));
const logger        = pino({ level: process.env.LOG_LEVEL || "info" });

const PORT          = parseInt(process.env.PORT          || "3001");
const INTERNAL_KEY  = process.env.INTERNAL_KEY           || "knfc-wa-internal-key";
const DJANGO_URL    = process.env.DJANGO_URL             || "http://127.0.0.1:8000";

// ── Express + HTTP + WebSocket server ────────────────────────────────────────

const app    = express();
app.use(express.json({ limit: "20mb" }));

const server = createServer(app);
const wss    = new WebSocketServer({ server });

// ── Session state ─────────────────────────────────────────────────────────────

const sessions = { otp: null, broadcast: null };
const state = {
  otp:       { status: "disconnected", qr: null, phone: null },
  broadcast: { status: "disconnected", qr: null, phone: null },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pushState() {
  const msg = JSON.stringify({ type: "state", data: state });
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

/** Convert Indian mobile number to WhatsApp JID */
function toJid(phone) {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `${withCountry}@s.whatsapp.net`;
}

function requireKey(req, res, next) {
  if (req.headers["x-internal-key"] !== INTERNAL_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/** Notify Django when a session disconnects so it can email the admin */
async function alertDjangoDC(sessionName) {
  try {
    await fetch(`${DJANGO_URL}/api/v1/notifications/whatsapp-alert/`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": INTERNAL_KEY },
      body:    JSON.stringify({ session: sessionName, event: "disconnected" }),
    });
  } catch (e) {
    logger.warn(`alert-django failed: ${e.message}`);
  }
}

// ── Session management ────────────────────────────────────────────────────────

async function startSession(name) {
  const authDir = path.join(__dirname, "sessions", name);
  fs.mkdirSync(authDir, { recursive: true });

  const { state: authState, saveCreds } = await useMultiFileAuthState(authDir);
  const { version }                     = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth:                   authState,
    logger:                 pino({ level: "silent" }),
    browser:                ["KNFC", "Chrome", "120.0"],
    generateHighQualityLinkPreview: false,
    getMessage:             async () => undefined,
  });

  sessions[name] = sock;
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async update => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        state[name].qr     = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
        state[name].status = "qr";
        pushState();
        logger.info(`[${name}] QR ready — scan with WhatsApp`);
      } catch {}
    }

    if (connection === "open") {
      state[name].status = "connected";
      state[name].qr     = null;
      try {
        const jid = sock.user?.id;
        if (jid) state[name].phone = jid.split(":")[0].split("@")[0];
      } catch {}
      pushState();
      logger.info(`[${name}] Connected — ${state[name].phone}`);
    }

    if (connection === "close") {
      const code      = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode
        : lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;

      state[name].status = "disconnected";
      state[name].qr     = null;
      pushState();
      logger.warn(`[${name}] Closed — code=${code} loggedOut=${loggedOut}`);

      await alertDjangoDC(name);

      if (loggedOut) {
        fs.rmSync(authDir, { recursive: true, force: true });
        logger.info(`[${name}] Session cleared after logout`);
      }
      logger.info(`[${name}] Reconnecting in 5 s…`);
      setTimeout(() => startSession(name), 5000);
    }
  });
}

// ── REST endpoints ────────────────────────────────────────────────────────────

app.get("/", (_req, res) => res.json({
  service: "KNFC WhatsApp Service",
  status:  "running",
  sessions: Object.fromEntries(
    Object.entries(state).map(([k, v]) => [k, { status: v.status, phone: v.phone }])
  ),
}));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/status", requireKey, (_req, res) => res.json(state));

/** Logout and regenerate QR for a session */
app.post("/logout/:session", requireKey, async (req, res) => {
  const { session } = req.params;
  if (!["otp", "broadcast"].includes(session))
    return res.status(400).json({ error: "Unknown session — use 'otp' or 'broadcast'" });

  try { await sessions[session]?.logout(); } catch {}

  const authDir = path.join(__dirname, "sessions", session);
  fs.rmSync(authDir, { recursive: true, force: true });

  state[session] = { status: "disconnected", qr: null, phone: null };
  pushState();

  setTimeout(() => startSession(session), 500);
  res.json({ ok: true, message: "Logged out — new QR incoming" });
});

/**
 * Build an OTP WhatsApp message.
 *
 * Tries (in order):
 *   1. interactiveMessage with cta_url + cta_copy buttons  ← modern Baileys, works on most clients
 *   2. Plain text fallback with URL inline                  ← always works
 *
 * templateButtons / buttonsMessage are intentionally NOT used —
 * WhatsApp blocks those from unofficial clients since 2023.
 */
function buildOtpMessage(otp, expiry_minutes, site_url = "https://knfcs.com") {
  const body =
    `🍗 *KNFC Verification Code*\n\n` +
    `Your OTP is:\n\n` +
    `  *${otp}*\n\n` +
    `⏱ Valid for *${expiry_minutes} minutes*.\n` +
    `🔒 Do not share this code with anyone.`;

  const footer = "KNFC Fried Chicken — knfcs.com";

  // ── Option 1: interactive message with URL + copy-code buttons ───────────────
  // nativeFlowMessage renders real tappable buttons on WhatsApp Android/iOS 2024+
  const interactive = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body:   { text: body },
          footer: { text: footer },
          nativeFlowMessage: {
            buttons: [
              {
                // Opens the website — user can also read OTP from URL (not embedded here,
                // but the button title instructs them)
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Open Website or Copy Code for OTP",
                  url:          site_url,
                  merchant_url: site_url,
                }),
              },
              {
                // Copy-code button — tapping copies the OTP to clipboard on supported clients
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: `Copy OTP: ${otp}`,
                  copy_code:    otp,
                }),
              },
            ],
          },
        },
      },
    },
  };

  // ── Option 2: plain text fallback ────────────────────────────────────────────
  const plainText = {
    text:
      body +
      `\n\n👉 *Open Website:* ${site_url}` +
      `\n\n_${footer}_`,
  };

  return { interactive, plainText };
}

/** Send OTP message via the otp session */
app.post("/send-otp", requireKey, async (req, res) => {
  const { phone, otp, expiry_minutes = 5 } = req.body;
  if (!phone || !otp)
    return res.status(400).json({ error: "phone and otp are required" });

  if (state.otp.status !== "connected")
    return res.status(503).json({ error: "OTP WhatsApp not connected", status: state.otp.status });

  const jid          = toJid(phone);
  const site_url     = process.env.SITE_URL || "https://knfcs.com";
  const { interactive, plainText } = buildOtpMessage(otp, expiry_minutes, site_url);

  try {
    // Try interactive first; fall back to plain text if Baileys rejects it
    try {
      await sessions.otp.sendMessage(jid, interactive);
    } catch (interactiveErr) {
      logger.warn(`[otp] Interactive message failed (${interactiveErr.message}), falling back to plain text`);
      await sessions.otp.sendMessage(jid, plainText);
    }
    logger.info(`[otp] Sent OTP → ${phone}`);
    res.json({ ok: true });
  } catch (e) {
    logger.error(`[otp] send-otp failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

/** Send a broadcast message via the broadcast session */
app.post("/send-message", requireKey, async (req, res) => {
  const { phone, text, image_url, caption, button_url, button_text } = req.body;
  if (!phone)
    return res.status(400).json({ error: "phone is required" });

  if (state.broadcast.status !== "connected")
    return res.status(503).json({ error: "Broadcast WhatsApp not connected", status: state.broadcast.status });

  const jid      = toJid(phone);
  const bodyText = caption || text || "";
  // Append URL as plain text link — works on all WhatsApp clients (Web, Desktop, Mobile)
  const fullText = button_url
    ? `${bodyText}\n\n👉 ${button_text || "Order Now"}: ${button_url}`
    : bodyText;

  try {
    if (image_url) {
      await sessions.broadcast.sendMessage(jid, { image: { url: image_url }, caption: fullText });
    } else {
      await sessions.broadcast.sendMessage(jid, { text: fullText });
    }
    logger.info(`[broadcast] Sent → ${phone}`);
    res.json({ ok: true });
  } catch (e) {
    logger.error(`[broadcast] send-message to ${phone} failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ── WebSocket — stream state to connected admin frontends ─────────────────────

wss.on("connection", ws => {
  ws.send(JSON.stringify({ type: "state", data: state }));
});

// ── Boot ──────────────────────────────────────────────────────────────────────

async function main() {
  logger.info("Starting KNFC WhatsApp service…");
  await startSession("otp");
  await startSession("broadcast");
  server.listen(PORT, () =>
    logger.info(`Listening on port ${PORT}  |  WS: ws://127.0.0.1:${PORT}`)
  );
}

main().catch(e => { logger.error(e); process.exit(1); });
