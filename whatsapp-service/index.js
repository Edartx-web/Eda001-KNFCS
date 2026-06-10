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
 *
 * Session persistence:
 *   Sessions are synced to Supabase S3 (wa-sessions/<name>/) so they survive
 *   container restarts on Render free tier — no QR rescan needed after restart.
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
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const __dirname     = path.dirname(fileURLToPath(import.meta.url));
const logger        = pino({ level: process.env.LOG_LEVEL || "info" });

const PORT          = parseInt(process.env.PORT) || 3001;
const INTERNAL_KEY  = process.env.INTERNAL_KEY           || "knfc-wa-internal-key";
const DJANGO_URL    = process.env.DJANGO_URL             || "http://127.0.0.1:8000";

// ── Supabase S3 session persistence ──────────────────────────────────────────
// Reuses the same Supabase bucket as Django media storage.
// Sessions stored under prefix: wa-sessions/<name>/

const s3 = (process.env.SUPABASE_S3_ACCESS_KEY && process.env.SUPABASE_S3_URL)
  ? new S3Client({
      endpoint:    process.env.SUPABASE_S3_URL,
      region:      process.env.SUPABASE_S3_REGION || "ap-southeast-2",
      credentials: {
        accessKeyId:     process.env.SUPABASE_S3_ACCESS_KEY,
        secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY,
      },
      forcePathStyle: true,
    })
  : null;

const S3_BUCKET = process.env.SUPABASE_BUCKET || "knfc-media";
const S3_PREFIX = "wa-sessions";

async function s3DownloadSession(name) {
  if (!s3) return;
  const dir = path.join(__dirname, "sessions", name);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: `${S3_PREFIX}/${name}/`,
    }));
    if (!list.Contents?.length) {
      logger.info(`[${name}] No saved session in Supabase — fresh start`);
      return;
    }
    for (const obj of list.Contents) {
      const filename = obj.Key.split("/").pop();
      if (!filename) continue;
      const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: obj.Key }));
      const chunks = [];
      for await (const chunk of res.Body) chunks.push(chunk);
      fs.writeFileSync(path.join(dir, filename), Buffer.concat(chunks));
    }
    logger.info(`[${name}] Session restored from Supabase (${list.Contents.length} files)`);
  } catch (e) {
    logger.warn(`[${name}] s3DownloadSession failed: ${e.message}`);
  }
}

async function s3UploadSession(name) {
  if (!s3) return;
  const dir = path.join(__dirname, "sessions", name);
  if (!fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir).filter(f =>
      !fs.statSync(path.join(dir, f)).isDirectory()
    );
    for (const file of files) {
      const data = fs.readFileSync(path.join(dir, file));
      await s3.send(new PutObjectCommand({
        Bucket:      S3_BUCKET,
        Key:         `${S3_PREFIX}/${name}/${file}`,
        Body:        data,
        ContentType: "application/json",
      }));
    }
    logger.info(`[${name}] Session saved to Supabase (${files.length} files)`);
  } catch (e) {
    logger.warn(`[${name}] s3UploadSession failed: ${e.message}`);
  }
}

async function s3DeleteSession(name) {
  if (!s3) return;
  try {
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: `${S3_PREFIX}/${name}/`,
    }));
    for (const obj of (list.Contents || [])) {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: obj.Key }));
    }
    logger.info(`[${name}] Session cleared from Supabase`);
  } catch (e) {
    logger.warn(`[${name}] s3DeleteSession failed: ${e.message}`);
  }
}

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

  // Restore session files from Supabase before Baileys reads them
  await s3DownloadSession(name);

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

  // Save locally then sync every credential update to Supabase
  sock.ev.on("creds.update", async () => {
    await saveCreds();
    await s3UploadSession(name);
  });

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
      // Full sync on connect so Supabase always has the latest credentials
      await s3UploadSession(name);
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
        await s3DeleteSession(name);
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
  await s3DeleteSession(session);

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
    `Dear User,\n\n` +
    `We received a request to access your account. Please use the following OTP to complete your login:\n\n` +
    `🔑  *${otp}*\n\n` +
    `This code will expire in *${expiry_minutes} minutes*.\n\n` +
    `If you did not initiate this request, please disregard this message and contact support if necessary.`;

  const footer = "Regards, KNFC Fried Chicken";

  const interactive = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body:   { text: body },
          footer: { text: footer },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Open KNFC",
                  url:          site_url,
                  merchant_url: site_url,
                }),
              },
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Copy OTP",
                  copy_code:    otp,
                }),
              },
            ],
          },
        },
      },
    },
  };

  const plainText = {
    text: body + `\n\n_${footer}_`,
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

/**
 * Build a professional broadcast WhatsApp message.
 *
 * Buttons (interactive nativeFlowMessage):
 *   1. cta_url  → "Order Now"  (always present when button_url given)
 *   2. cta_copy → "Copy Code"  (only when coupon_code given)
 *
 * Falls back to plain text if the interactive send fails.
 */
function buildBroadcastMessage(bodyText, footer, button_url, button_text, coupon_code) {
  const buttons = [];

  if (button_url) {
    buttons.push({
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: button_text || "Order Now",
        url:          button_url,
        merchant_url: button_url,
      }),
    });
  }

  if (coupon_code) {
    buttons.push({
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: `Copy Code: ${coupon_code}`,
        copy_code:    coupon_code,
      }),
    });
  }

  const interactive = buttons.length > 0
    ? {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body:   { text: bodyText },
              footer: { text: footer },
              nativeFlowMessage: { buttons },
            },
          },
        },
      }
    : null;

  const plainText = { text: bodyText + (footer ? `\n\n_${footer}_` : "") };

  return { interactive, plainText };
}


/** Send a broadcast message via the broadcast session */
app.post("/send-message", requireKey, async (req, res) => {
  const { phone, text, image_url, caption, button_url, button_text, coupon_code } = req.body;
  if (!phone)
    return res.status(400).json({ error: "phone is required" });

  if (state.broadcast.status !== "connected")
    return res.status(503).json({ error: "Broadcast WhatsApp not connected", status: state.broadcast.status });

  const jid      = toJid(phone);
  const bodyText = caption || text || "";
  const footer   = "KNFC Fried Chicken — knfcs.com";
  const { interactive, plainText } = buildBroadcastMessage(
    bodyText, footer, button_url, button_text, coupon_code
  );

  try {
    if (image_url) {
      // Image messages can't carry interactive buttons — embed CTA in caption
      const ctaLine = button_url ? `\n\n👉 *${button_text || "Order Now"}:* ${button_url}` : "";
      const copyLine = coupon_code ? `\n🎟 *Copy Code:* ${coupon_code}` : "";
      await sessions.broadcast.sendMessage(jid, {
        image:   { url: image_url },
        caption: bodyText + ctaLine + copyLine,
      });
    } else if (interactive) {
      // Text broadcast — interactive buttons
      try {
        await sessions.broadcast.sendMessage(jid, interactive);
      } catch (interactiveErr) {
        logger.warn(`[broadcast] Interactive failed (${interactiveErr.message}), falling back to plain text`);
        await sessions.broadcast.sendMessage(jid, plainText);
      }
    } else {
      await sessions.broadcast.sendMessage(jid, plainText);
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

// Keep-alive note: Render ignores self-pings for inactivity tracking.
// This service is kept alive by the Django Celery worker (knfc-celery),
// which pings /health every 12 min from outside this container.

async function main() {
  logger.info("Starting KNFC WhatsApp service…");
  if (s3) {
    logger.info(`Session persistence: Supabase S3 bucket=${S3_BUCKET} prefix=${S3_PREFIX}/`);
  } else {
    logger.warn("Session persistence: LOCAL ONLY — set SUPABASE_S3_* env vars to enable Supabase sync");
  }
  await startSession("otp");
  await startSession("broadcast");
  server.listen(PORT, () => {
    logger.info(`Listening on port ${PORT}  |  WS: ws://127.0.0.1:${PORT}`);
  });
}

main().catch(e => { logger.error(e); process.exit(1); });
