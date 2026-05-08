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
    "SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
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
    `SELECT s.id AS session_id, s.user_id, s.expires_at, u.email, u.role
     FROM auth_sessions s
     INNER JOIN users u ON u.id = s.user_id
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

//Protected API placeholders.
app.post("/api/reportfault", requireAuth, async (req, res) => {
  try {
    //Required fields check before business logic.
    const { faultyPart, typeOfFault } = req.body || {};
    if (!faultyPart || !typeOfFault) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    res.status(501).json({ error: "Not implemented yet." });
  } catch (error) {
    console.error("reportfault error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/recievefaults", requireAuth, async (_req, res) => {
  res.status(501).json({ error: "Not implemented yet." });
});

app.post("/api/scantoolin", requireAuth, async (_req, res) => {
  res.status(501).json({ error: "Not implemented yet." });
});

app.post("/api/scantoolout", requireAuth, async (_req, res) => {
  res.status(501).json({ error: "Not implemented yet." });
});

app.post("/api/fetchstepbystep", requireAuth, async (_req, res) => {
  res.status(501).json({ error: "Not implemented yet." });
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
