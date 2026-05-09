const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mariadb = require("mariadb");
require("dotenv").config();

const app = express();
//Server port falls back to 8080 for local development.
const PORT = Number(process.env.PORT || 8080);
//Cookie key used by both login and auth middleware.
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ar_session";
//Session lifetime in seconds; default is 8 hours.
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 8);
//Production mode enables stricter cookie transport settings.
const IS_PRODUCTION = process.env.NODE_ENV === "production";
//Fallback hash keeps response timing closer for unknown users.
const DUMMY_BCRYPT_HASH =
  "$2b$12$7vpi3jUfHJQFA6PjKf3k5ONrT3sJgjM5h8on8Y9NHxN5XsvfCQ56q";

//Origin allowlist is read from env and normalized into a Set for fast lookup.
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

//Allows localhost and private LAN ranges for device testing in development.
const localDevOriginPattern =
  /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?$/i;

function isAllowedOrigin(origin) {
  //Requests with no Origin header are typically same-origin or server-to-server.
  if (!origin) return true;
  //Explicitly configured origins are always allowed.
  if (allowedOrigins.has(origin)) return true;

  //Private-network origins are allowed only outside production.
  if (!IS_PRODUCTION && localDevOriginPattern.test(origin)) {
    return true;
  }

  //Everything else is rejected by CORS.
  return false;
}

//Connection pool reuses DB connections across requests.
const dbPool = mariadb.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ar_maintenance",
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 8),
  timezone: "Z",
});

//Trust proxy is needed when deployed behind reverse proxies.
app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      //CORS callback accepts or rejects each request origin.
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      //Rejected origins fail CORS preflight/requests.
      callback(new Error("Origin not allowed by CORS"));
    },
    //Credentials=true allows browser cookies to be sent.
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
//JSON body size limit blocks oversized payloads.
app.use(express.json({ limit: "25kb" }));

function parseCookies(cookieHeader = "") {
  //Split raw Cookie header into individual key=value segments.
  return cookieHeader
    .split(";")
    //Trim whitespace around each segment.
    .map((segment) => segment.trim())
    //Discard empty segments.
    .filter(Boolean)
    //Convert segments into an object map { cookieName: cookieValue }.
    .reduce((accumulator, segment) => {
      const separatorIndex = segment.indexOf("=");
      //Ignore malformed cookie entries with no "=".
      if (separatorIndex < 0) return accumulator;
      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();
      //decodeURIComponent restores encoded cookie characters.
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

function createSessionToken() {
  //32 random bytes gives a 64-char hex token.
  return crypto.randomBytes(32).toString("hex");
}

function hashSessionToken(token) {
  //Only hashed tokens are stored in DB to reduce leak impact.
  return crypto.createHash("sha256").update(token).digest("hex");
}

function setSessionCookie(res, sessionToken) {
  //HttpOnly prevents JavaScript access from the browser.
  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    //Secure=true in production sends cookie only over HTTPS.
    secure: IS_PRODUCTION,
    //Strict blocks cross-site cookie sends.
    sameSite: "strict",
    path: "/",
    //maxAge controls browser cookie expiry.
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

function clearSessionCookie(res) {
  //Clears the session cookie on logout or invalidation.
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "strict",
    path: "/",
  });
}

async function getUserByEmail(email) {
  //Parameterized query prevents SQL injection on email lookup.
  const rows = await dbPool.query(
    `SELECT u.id, u.email, u.password_hash, r.name AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.email = ?
     LIMIT 1`,
    [email],
  );
  //Returns null when user does not exist.
  return rows[0] || null;
}

async function getAuthSessionFromRequest(req) {
  //Reads cookies directly from the incoming request header.
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  //Missing cookie means no authenticated session.
  if (!sessionToken) {
    return null;
  }

  //Cookie token is hashed before DB comparison.
  const tokenHash = hashSessionToken(sessionToken);
  const rows = await dbPool.query(
    `SELECT s.id AS session_id, s.user_id, s.expires_at, u.email, r.name AS role
     FROM auth_sessions s
     INNER JOIN users u ON u.id = s.user_id
     INNER JOIN roles r ON r.id = u.role_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
  );

  const activeSession = rows[0];
  //No row means invalid token or expired session.
  if (!activeSession) {
    return null;
  }

  //Tracks recent activity for audit/cleanup logic.
  await dbPool.query("UPDATE auth_sessions SET last_seen_at = UTC_TIMESTAMP() WHERE id = ?", [
    activeSession.session_id,
  ]);

  //Normalized session object used by route handlers.
  return {
    sessionId: activeSession.session_id,
    userId: activeSession.user_id,
    email: activeSession.email,
    role: activeSession.role,
  };
}

async function requireAuth(req, res, next) {
  try {
    //Resolve session from cookie and DB.
    const authSession = await getAuthSessionFromRequest(req);
    if (!authSession) {
      //401 signals missing/invalid auth.
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    //Attach auth context for downstream handlers.
    req.auth = authSession;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getStatusIdByName(statusName) {
  const rows = await dbPool.query("SELECT id FROM fault_status WHERE name = ? LIMIT 1", [statusName]);
  return rows[0]?.id ?? null;
}

async function getSeverityIdFromUrgency(urgency) {
  const normalizedUrgency = String(urgency || "")
    .trim()
    .toLowerCase();

  const urgencyLevelMap = {
    low: 1,
    medium: 2,
    high: 4,
    critical: 5,
  };

  const level = urgencyLevelMap[normalizedUrgency];
  if (!level) return null;

  const rows = await dbPool.query(
    "SELECT id FROM fault_severities WHERE level = ? LIMIT 1",
    [level],
  );
  return rows[0]?.id ?? null;
}

async function getAssetAndFaultTypeByQr(assetFaultQrCode) {
  const rows = await dbPool.query(
    `SELECT asset_id, fault_type_id
     FROM faults
     WHERE asset_fault_qr_code = ?
     ORDER BY id DESC
     LIMIT 1`,
    [assetFaultQrCode],
  );
  return rows[0] || null;
}

async function getFaultTypeIdByName(faultTypeName) {
  const normalizedName = String(faultTypeName || "").trim();
  if (!normalizedName) return null;

  const rows = await dbPool.query(
    "SELECT id FROM fault_types WHERE name = ? LIMIT 1",
    [normalizedName],
  );
  return rows[0]?.id ?? null;
}

async function getAssetIdFromLabel(assetLabel) {
  const normalizedLabel = String(assetLabel || "").trim().toLowerCase();
  if (!normalizedLabel) return null;

  const tokenSet = new Set(
    normalizedLabel
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );

  if (tokenSet.size === 0) return null;

  const assets = await dbPool.query("SELECT id, name FROM fault_assets");
  let bestAssetId = null;
  let bestScore = 0;

  assets.forEach((asset) => {
    const candidateName = String(asset.name || "").toLowerCase();
    let score = 0;
    tokenSet.forEach((token) => {
      if (candidateName.includes(token)) {
        score += 1;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestAssetId = asset.id;
    }
  });

  return bestScore > 0 ? bestAssetId : null;
}

async function getMostRecentAssetIdByFaultType(faultTypeId) {
  const rows = await dbPool.query(
    `SELECT asset_id
     FROM faults
     WHERE fault_type_id = ?
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [faultTypeId],
  );
  return rows[0]?.asset_id ?? null;
}

async function getLatestOpenFaultIdForRepair(assetFaultQrCode, faultTypeId) {
  const fixedStatusId = await getStatusIdByName("fixed");
  if (!fixedStatusId) return null;

  if (assetFaultQrCode) {
    const byQrRows = await dbPool.query(
      `SELECT id
       FROM faults
       WHERE asset_fault_qr_code = ? AND status_id <> ?
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [assetFaultQrCode, fixedStatusId],
    );

    if (byQrRows[0]?.id) {
      return byQrRows[0].id;
    }
  }

  if (faultTypeId) {
    const byTypeRows = await dbPool.query(
      `SELECT id
       FROM faults
       WHERE fault_type_id = ? AND status_id <> ?
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [faultTypeId, fixedStatusId],
    );

    if (byTypeRows[0]?.id) {
      return byTypeRows[0].id;
    }
  }

  return null;
}

async function getDefaultSeverityIdForFaultType(faultTypeId) {
  const rows = await dbPool.query("SELECT severity_id FROM fault_types WHERE id = ? LIMIT 1", [faultTypeId]);
  return rows[0]?.severity_id ?? null;
}

function formatFaultRowForUi(faultRow) {
  const faultId = String(faultRow.id);
  const dateValue = faultRow.created_at ? new Date(faultRow.created_at) : null;
  const reportedAt = dateValue ? dateValue.toLocaleString() : "Unknown time";
  const notes = faultRow.notes || "No notes provided.";
  const qrLabel = faultRow.asset_fault_qr_code ? ` | QR: ${faultRow.asset_fault_qr_code}` : "";
  return {
    id: faultId,
    title: `${faultRow.fault_type_name} [${faultRow.status_name}]`,
    description: `${faultRow.asset_name} - ${faultRow.component_name}`,
    details: `Severity: ${faultRow.severity_name} (L${faultRow.severity_level}) | Reported by: ${faultRow.reported_by_email || "Unknown"} | ${reportedAt}${qrLabel}\n${notes}`,
    raw: {
      faultId,
      assetName: faultRow.asset_name,
      componentName: faultRow.component_name,
      faultTypeName: faultRow.fault_type_name,
      statusName: faultRow.status_name,
      severityName: faultRow.severity_name,
      severityLevel: faultRow.severity_level,
      qrCode: faultRow.asset_fault_qr_code,
      reportedBy: faultRow.reported_by_email,
      notes: faultRow.notes,
      createdAt: faultRow.created_at,
    },
  };
}

app.use("/api/auth", (_req, res, next) => {
  //Disables browser/proxy caching on auth endpoints.
  res.setHeader("Cache-Control", "no-store");
  next();
});

async function handleLogin(req, res) {
  //Normalize and validate login input.
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  //Empty credentials fail fast.
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  //Basic input length limits prevent pathological payloads.
  if (email.length > 254 || password.length > 200) {
    res.status(400).json({ error: "Invalid login input." });
    return;
  }

  try {
    //Fetch user once by normalized email.
    const user = await getUserByEmail(email);
    //Unknown users still run bcrypt compare against dummy hash.
    const hashToCompare = user ? user.password_hash : DUMMY_BCRYPT_HASH;
    //bcrypt compare is resistant to timing leaks on raw strings.
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    //Either missing user or bad password returns generic auth error.
    if (!user || !isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    //Create raw token for cookie and hashed token for DB storage.
    const sessionToken = createSessionToken();
    const tokenHash = hashSessionToken(sessionToken);

    //Persist session with expiry and timestamps.
    await dbPool.query(
      `INSERT INTO auth_sessions (user_id, token_hash, expires_at, created_at, last_seen_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [user.id, tokenHash, SESSION_TTL_SECONDS],
    );

    //Send session token as secure cookie.
    setSessionCookie(res, sessionToken);

    //Returns minimal user identity metadata.
    res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

//Primary login endpoint.
app.post("/api/auth/login", handleLogin);

app.get("/api/auth/session", async (req, res) => {
  try {
    //Checks if the current request still has a valid session.
    const authSession = await getAuthSessionFromRequest(req);

    if (!authSession) {
      //Caller is not authenticated.
      res.status(401).json({ authenticated: false });
      return;
    }

    //Caller is authenticated; return basic session user info.
    res.status(200).json({
      authenticated: true,
      user: {
        id: authSession.userId,
        email: authSession.email,
        role: authSession.role,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    //Read cookie so matching DB session can be removed.
    const cookies = parseCookies(req.headers.cookie || "");
    const sessionToken = cookies[SESSION_COOKIE_NAME];

    //Token is optional; logout should still clear cookie either way.
    if (sessionToken) {
      const tokenHash = hashSessionToken(sessionToken);
      //Delete only the matching session record.
      await dbPool.query("DELETE FROM auth_sessions WHERE token_hash = ?", [tokenHash]);
    }

    //Removes cookie from browser.
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

//Legacy login path kept for compatibility.
app.post("/LogInPage", handleLogin);

app.post("/api/reportfault", requireAuth, async (req, res) => {
  try {
    const {
      faultTypeId: faultTypeIdInput,
      faultTypeName: faultTypeNameInput,
      assetId: assetIdInput,
      assetLabel: assetLabelInput,
      assetFaultMarkerCode: assetFaultMarkerCodeInput,
      assetFaultQrCode: assetFaultQrCodeInput,
      urgency,
      notes,
    } = req.body || {};

    const assetFaultQrCode = String(
      assetFaultMarkerCodeInput || assetFaultQrCodeInput || "",
    )
      .trim()
      .slice(0, 80);
    const assetLabel = String(assetLabelInput || "").trim().slice(0, 160);
    const faultTypeName = String(faultTypeNameInput || "").trim().slice(0, 100);
    let faultTypeId = Number(faultTypeIdInput || 0);
    let assetId = Number(assetIdInput || 0);

    if (!faultTypeId && faultTypeName) {
      faultTypeId = Number(await getFaultTypeIdByName(faultTypeName)) || 0;
    }

    if ((!faultTypeId || !assetId) && assetFaultQrCode) {
      const resolvedPair = await getAssetAndFaultTypeByQr(assetFaultQrCode);
      if (resolvedPair) {
        faultTypeId = Number(resolvedPair.fault_type_id);
        assetId = Number(resolvedPair.asset_id);
      }
    }

    if (!assetId && assetLabel) {
      assetId = Number(await getAssetIdFromLabel(assetLabel)) || 0;
    }

    if (!assetId && assetFaultQrCode) {
      const qrAsLabel = assetFaultQrCode
        .replace(/^AR-FAULT-/i, "")
        .replace(/-/g, " ")
        .trim();
      if (qrAsLabel) {
        assetId = Number(await getAssetIdFromLabel(qrAsLabel)) || 0;
      }
    }

    if (!assetId && faultTypeId) {
      assetId = Number(await getMostRecentAssetIdByFaultType(faultTypeId)) || 0;
    }

    if (!faultTypeId || !assetId) {
      res.status(400).json({
        error:
          "Unable to resolve asset and fault type. Provide a known fault type and scan a registered fault marker.",
      });
      return;
    }

    const reportedStatusId = await getStatusIdByName("reported");
    if (!reportedStatusId) {
      res.status(500).json({ error: "Fault status configuration is missing." });
      return;
    }

    const severityFromUrgency = await getSeverityIdFromUrgency(urgency);
    const defaultSeverity = await getDefaultSeverityIdForFaultType(faultTypeId);
    const severityId = severityFromUrgency || defaultSeverity;

    if (!severityId) {
      res.status(500).json({ error: "Fault severity configuration is missing." });
      return;
    }

    const notesText = String(notes || "").trim();
    const safeNotesText = notesText ? notesText.slice(0, 500) : null;
    const upsertResult = await dbPool.query(
      `INSERT INTO faults (
         fault_type_id,
         asset_id,
         severity_id,
         status_id,
         asset_fault_qr_code,
         notes,
         created_by_user_id,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id),
         fault_type_id = VALUES(fault_type_id),
         asset_id = VALUES(asset_id),
         severity_id = VALUES(severity_id),
         status_id = VALUES(status_id),
         asset_fault_qr_code = VALUES(asset_fault_qr_code),
         notes = VALUES(notes),
         created_by_user_id = VALUES(created_by_user_id),
         updated_at = UTC_TIMESTAMP()`,
      [
        faultTypeId,
        assetId,
        severityId,
        reportedStatusId,
        assetFaultQrCode || null,
        safeNotesText,
        req.auth.userId,
      ],
    );

    const faultId = Number(upsertResult.insertId);
    const wasExistingFault = Number(upsertResult.affectedRows) > 1;

    const insertedFaultRows = await dbPool.query(
      `SELECT
         f.id,
         f.asset_fault_qr_code,
         f.notes,
         f.created_at,
         fa.name AS asset_name,
         fc.name AS component_name,
         ft.name AS fault_type_name,
         fst.name AS status_name,
         fsev.name AS severity_name,
         fsev.level AS severity_level,
         u.email AS reported_by_email
       FROM faults f
       INNER JOIN fault_assets fa ON fa.id = f.asset_id
       INNER JOIN fault_types ft ON ft.id = f.fault_type_id
       INNER JOIN fault_component fc ON fc.id = ft.component_id
       INNER JOIN fault_status fst ON fst.id = f.status_id
       INNER JOIN fault_severities fsev ON fsev.id = f.severity_id
       LEFT JOIN users u ON u.id = f.created_by_user_id
       WHERE f.id = ?
       LIMIT 1`,
      [faultId],
    );

    const createdFault = insertedFaultRows[0];
    res.status(wasExistingFault ? 200 : 201).json({
      ok: true,
      fault: createdFault ? formatFaultRowForUi(createdFault) : null,
      wasUpdated: wasExistingFault,
    });
  } catch (error) {
    console.error("reportfault error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/markfaultrepaired", requireAuth, async (req, res) => {
  try {
    const assetFaultQrCode = String(
      req.body?.assetFaultMarkerCode || req.body?.assetFaultQrCode || "",
    )
      .trim()
      .slice(0, 80);
    let faultTypeId = Number(req.body?.faultTypeId || 0);

    if (!faultTypeId && assetFaultQrCode) {
      const resolvedPair = await getAssetAndFaultTypeByQr(assetFaultQrCode);
      if (resolvedPair?.fault_type_id) {
        faultTypeId = Number(resolvedPair.fault_type_id);
      }
    }

    const fixedStatusId = await getStatusIdByName("fixed");
    if (!fixedStatusId) {
      res.status(500).json({ error: "Fault status configuration is missing." });
      return;
    }

    const targetFaultId = await getLatestOpenFaultIdForRepair(assetFaultQrCode, faultTypeId);
    if (!targetFaultId) {
      res.status(404).json({ error: "No active fault found for this guide marker." });
      return;
    }

    await dbPool.query(
      `UPDATE faults
       SET status_id = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [fixedStatusId, targetFaultId],
    );

    const repairedFaultRows = await dbPool.query(
      `SELECT
         f.id,
         f.asset_fault_qr_code,
         f.notes,
         f.created_at,
         fa.name AS asset_name,
         fc.name AS component_name,
         ft.name AS fault_type_name,
         fst.name AS status_name,
         fsev.name AS severity_name,
         fsev.level AS severity_level,
         u.email AS reported_by_email
       FROM faults f
       INNER JOIN fault_assets fa ON fa.id = f.asset_id
       INNER JOIN fault_types ft ON ft.id = f.fault_type_id
       INNER JOIN fault_component fc ON fc.id = ft.component_id
       INNER JOIN fault_status fst ON fst.id = f.status_id
       INNER JOIN fault_severities fsev ON fsev.id = f.severity_id
       LEFT JOIN users u ON u.id = f.created_by_user_id
       WHERE f.id = ?
       LIMIT 1`,
      [targetFaultId],
    );

    const repairedFault = repairedFaultRows[0];
    res.status(200).json({
      ok: true,
      fault: repairedFault ? formatFaultRowForUi(repairedFault) : null,
    });
  } catch (error) {
    console.error("markfaultrepaired error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/recievefaults", requireAuth, async (_req, res) => {
  try {
    const rows = await dbPool.query(
      `SELECT
         f.id,
         f.asset_fault_qr_code,
         f.notes,
         f.created_at,
         fa.name AS asset_name,
         fc.name AS component_name,
         ft.name AS fault_type_name,
         fst.name AS status_name,
         fsev.name AS severity_name,
         fsev.level AS severity_level,
         u.email AS reported_by_email
       FROM faults f
       INNER JOIN fault_assets fa ON fa.id = f.asset_id
       INNER JOIN fault_types ft ON ft.id = f.fault_type_id
       INNER JOIN fault_component fc ON fc.id = ft.component_id
       INNER JOIN fault_status fst ON fst.id = f.status_id
       INNER JOIN fault_severities fsev ON fsev.id = f.severity_id
       LEFT JOIN users u ON u.id = f.created_by_user_id
       WHERE fst.name <> 'fixed'
       ORDER BY f.created_at DESC
       LIMIT 200`,
    );

    res.status(200).json({
      faults: rows.map(formatFaultRowForUi),
    });
  } catch (error) {
    console.error("recievefaults error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/faulttypes", requireAuth, async (_req, res) => {
  try {
    const rows = await dbPool.query(
      `SELECT
         ft.id,
         ft.name,
         ft.description,
         ft.severity_id,
         fc.id AS component_id,
         fc.name AS component_name,
         fsev.name AS severity_name,
         fsev.level AS severity_level
       FROM fault_types ft
       INNER JOIN fault_component fc ON fc.id = ft.component_id
       INNER JOIN fault_severities fsev ON fsev.id = ft.severity_id
       ORDER BY fc.name ASC, ft.name ASC`,
    );

    res.status(200).json({
      faultTypes: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        componentId: row.component_id,
        componentName: row.component_name,
        severityId: row.severity_id,
        severityName: row.severity_name,
        severityLevel: row.severity_level,
      })),
    });
  } catch (error) {
    console.error("faulttypes error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/tools", requireAuth, async (_req, res) => {
  try {
    const rows = await dbPool.query(
      `SELECT
         t.id,
         t.name,
         t.qr_code,
         t.last_action,
         t.last_checked_out_at,
         t.last_checked_in_at,
         u.email AS last_checked_out_by_email
       FROM tools t
       LEFT JOIN users u ON u.id = t.last_checked_out_by_user_id
       ORDER BY t.name ASC`,
    );

    res.status(200).json({
      tools: rows.map((toolRow) => ({
        id: toolRow.id,
        name: toolRow.name,
        markerCode: toolRow.qr_code,
        lastAction: toolRow.last_action,
        isCheckedOut: toolRow.last_action === "checked_out",
        lastCheckedOutAt: toolRow.last_checked_out_at,
        lastCheckedInAt: toolRow.last_checked_in_at,
        lastCheckedOutByEmail: toolRow.last_checked_out_by_email,
      })),
    });
  } catch (error) {
    console.error("tools error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

async function handleToolScanAction(req, res, action) {
  const qrCode = String(req.body?.markerCode || req.body?.qrCode || "")
    .trim()
    .slice(0, 80);
  if (!qrCode) {
    res.status(400).json({ error: "markerCode is required." });
    return;
  }

  const tools = await dbPool.query(
    `SELECT id, name, qr_code, last_action
     FROM tools
     WHERE qr_code = ?
     LIMIT 1`,
    [qrCode],
  );

  const tool = tools[0];
  if (!tool) {
    res.status(404).json({ error: "Tool not found for scanned marker code." });
    return;
  }

  const actionVerb = action === "checked_in" ? "check in" : "check out";
  if (action === "checked_out" && tool.last_action === "checked_out") {
    res.status(409).json({ error: `${tool.name} is already checked out.` });
    return;
  }

  if (action === "checked_in" && tool.last_action !== "checked_out") {
    res.status(409).json({ error: `${tool.name} is not currently checked out.` });
    return;
  }

  if (action === "checked_out") {
    await dbPool.query(
      `UPDATE tools
       SET
         last_action = 'checked_out',
         last_checked_out_by_user_id = ?,
         last_checked_out_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [req.auth.userId, tool.id],
    );
  } else {
    await dbPool.query(
      `UPDATE tools
       SET
         last_action = 'checked_in',
         last_checked_in_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [tool.id],
    );
  }

  await dbPool.query(
    `INSERT INTO tool_check_out (tool_id, user_id, action, action_at, notes)
     VALUES (?, ?, ?, UTC_TIMESTAMP(), ?)`,
    [tool.id, req.auth.userId, action, `Tool scan ${actionVerb} via AR marker.`],
  );

  const refreshedRows = await dbPool.query(
    `SELECT
       t.id,
       t.name,
       t.qr_code,
       t.last_action,
       t.last_checked_out_at,
       t.last_checked_in_at,
       u.email AS last_checked_out_by_email
     FROM tools t
     LEFT JOIN users u ON u.id = t.last_checked_out_by_user_id
     WHERE t.id = ?
     LIMIT 1`,
    [tool.id],
  );

  const refreshedTool = refreshedRows[0];
  res.status(200).json({
    ok: true,
    tool: {
      id: refreshedTool.id,
      name: refreshedTool.name,
      markerCode: refreshedTool.qr_code,
      lastAction: refreshedTool.last_action,
      isCheckedOut: refreshedTool.last_action === "checked_out",
      lastCheckedOutAt: refreshedTool.last_checked_out_at,
      lastCheckedInAt: refreshedTool.last_checked_in_at,
      lastCheckedOutByEmail: refreshedTool.last_checked_out_by_email,
    },
  });
}

app.post("/api/scantoolin", requireAuth, async (req, res) => {
  try {
    await handleToolScanAction(req, res, "checked_in");
  } catch (error) {
    console.error("scantoolin error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/scantoolout", requireAuth, async (req, res) => {
  try {
    await handleToolScanAction(req, res, "checked_out");
  } catch (error) {
    console.error("scantoolout error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/fetchstepbystep", requireAuth, async (req, res) => {
  try {
    const assetFaultQrCode = String(
      req.body?.assetFaultMarkerCode || req.body?.assetFaultQrCode || "",
    )
      .trim()
      .slice(0, 80);
    let faultTypeId = Number(req.body?.faultTypeId || 0);

    if (!faultTypeId && assetFaultQrCode) {
      const resolvedPair = await getAssetAndFaultTypeByQr(assetFaultQrCode);
      if (resolvedPair?.fault_type_id) {
        faultTypeId = Number(resolvedPair.fault_type_id);
      }
    }

    if (!faultTypeId) {
      res.status(400).json({ error: "faultTypeId or a valid asset fault marker code is required." });
      return;
    }

    const stepRows = await dbPool.query(
      `SELECT
         fi.step_order,
         fi.instruction_step,
         ft.name AS fault_type_name,
         fc.name AS component_name
       FROM fault_instructions fi
       INNER JOIN fault_types ft ON ft.id = fi.fault_type_id
       INNER JOIN fault_component fc ON fc.id = fi.component_id
       WHERE fi.fault_type_id = ?
       ORDER BY fi.step_order ASC`,
      [faultTypeId],
    );

    res.status(200).json({
      steps: stepRows.map((row) => row.instruction_step),
      faultTypeId,
      faultTypeName: stepRows[0]?.fault_type_name || null,
      componentName: stepRows[0]?.component_name || null,
    });
  } catch (error) {
    console.error("fetchstepbystep error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/health", (_req, res) => {
  //Simple health probe endpoint.
  res.status(200).json({
    status: "ok",
    service: "server",
    timestamp: new Date().toISOString(),
  });
});

async function verifyDatabaseConnection() {
  //Borrow a connection to verify DB credentials and connectivity.
  const connection = await dbPool.getConnection();
  try {
    //Trivial query confirms DB responds.
    await connection.query("SELECT 1");
  } finally {
    //Always release connection back to the pool.
    connection.release();
  }
}

async function startServer() {
  try {
    //Fail fast on startup when DB is unreachable.
    await verifyDatabaseConnection();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    //Startup exits so orchestration can detect failure.
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

//Bootstraps server startup sequence.
startServer();
