import express from "express";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const app = express();
const PORT = 5000;
const SESSION_MS = 30 * 60 * 1000;
const sessions = new Map();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function readCookie(req, name) {
  const raw = req.headers.cookie ?? "";
  const match = raw.split(";").find((part) => part.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function setSession(res, userId) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_MS });
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MS,
  });
}

function currentUserId(req) {
  const token = readCookie(req, "session");
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_MS;
  return session.userId;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key.toString("hex"))));
  });
  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const next = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key.toString("hex"))));
  });
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(next, "hex"));
}

function toProfile(row) {
  return {
    id: row.id,
    accountNo: row.account_no,
    name: row.name,
    email: row.email,
    role: row.role,
    state: row.state,
    county: row.county,
    isStaff: row.is_staff,
  };
}

function toUser(row) {
  return { id: row.id, email: row.email, name: row.name };
}

async function requireStaff(req, res) {
  const userId = currentUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Sign in required" });
    return null;
  }
  const result = await pool.query("SELECT id, is_staff FROM users WHERE id = $1", [userId]);
  const row = result.rows[0];
  if (!row?.is_staff) {
    res.status(403).json({ message: "Staff only" });
    return null;
  }
  return row;
}

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      message: "MkulimaLink backend is connected to Neon!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, account_no)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, account_no, role, state, county, is_staff`,
      [name, email, passwordHash, `u-${Date.now()}`],
    );
    const row = result.rows[0];
    setSession(res, row.id);
    res.json({ user: toUser(row), profile: toProfile(row) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      `SELECT id, name, email, password_hash, account_no, role, state, county, is_staff
       FROM users WHERE email = $1`,
      [email],
    );
    const row = result.rows[0];
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return res.status(401).json({ message: "Wrong email or password" });
    }
    setSession(res, row.id);
    res.json({ user: toUser(row), profile: toProfile(row) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/me", async (req, res) => {
  const userId = currentUserId(req);
  if (!userId) return res.json({ user: null, profile: null });
  const result = await pool.query(
    `SELECT id, name, email, account_no, role, state, county, is_staff FROM users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return res.json({ user: null, profile: null });
  res.json({ user: toUser(row), profile: toProfile(row) });
});

app.post("/api/signout", (req, res) => {
  sessions.delete(readCookie(req, "session"));
  res.clearCookie("session");
  res.json({ success: true });
});

app.get("/api/market", async (req, res) => {
  try {
    const board = await pool.query(
      `SELECT crop_id, crop_name, category, unit_short, unit_kg, price, broker_price,
              change, uplift, board_date
       FROM board_prices
       ORDER BY board_date DESC`,
    );
    const lots = await pool.query(
      `SELECT id, crop_id, grade_id, quantity, price, county, ward, ready_in_days,
              note, created_at, farmer_name
       FROM listings
       WHERE status = 'open'
       ORDER BY created_at DESC`,
    );
    res.json({
      boardDate: board.rows[0]?.board_date ?? null,
      boardRows: board.rows.map((row) => ({
        id: row.crop_id,
        crop: row.crop_name,
        category: row.category,
        unit: row.unit_short,
        unitKg: Number(row.unit_kg),
        price: row.price,
        broker: row.broker_price,
        change: Number(row.change),
        uplift: Number(row.uplift),
        history: [],
      })),
      listings: lots.rows.map((row) => ({
        id: row.id,
        crop: row.crop_id,
        grade: row.grade_id,
        quantity: row.quantity,
        price: row.price,
        county: row.county,
        ward: row.ward,
        farmer: { name: row.farmer_name, lots: 0, rating: null },
        readyIn: row.ready_in_days,
        note: row.note,
        postedAt: row.created_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/listings", async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Sign in required" });

    const account = await pool.query("SELECT is_staff FROM users WHERE id = $1", [userId]);
    if (account.rows[0]?.is_staff) {
      return res.status(403).json({ message: "Staff cannot post a harvest" });
    }

    const form = req.body;
    const result = await pool.query(
      `INSERT INTO listings
        (farmer_id, farmer_name, crop_id, grade_id, quantity, price, county, ward, ready_in_days, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        form.farmerId,
        form.farmerName,
        form.crop,
        form.grade,
        form.quantity,
        form.price,
        form.county,
        form.ward,
        form.readyIn,
        form.note,
      ],
    );
    res.json({ id: result.rows[0].id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/admin", async (req, res) => {
  try {
    const staff = await requireStaff(req, res);
    if (!staff) return;

    const accounts = await pool.query(
      `SELECT id, account_no, name, email, role, state, county, created_at
       FROM users
       ORDER BY created_at DESC NULLS LAST`,
    );
    const lots = await pool.query(
      `SELECT id, crop_id, grade_id, quantity, price, county, ward, farmer_name, created_at
       FROM listings
       WHERE status = 'open'
       ORDER BY created_at DESC`,
    );
    const registrations = accounts.rows.map((row) => ({
      id: row.id,
      accountNo: row.account_no,
      name: row.name,
      phoneMasked: "—",
      role: row.role,
      county: row.county,
      channel: "web",
      state: row.state,
      deals: 0,
      gmv: 0,
      joinedAt: row.created_at,
    }));
    const listings = lots.rows.map((row) => ({
      id: row.id,
      crop: row.crop_id,
      grade: row.grade_id,
      quantity: row.quantity,
      price: row.price,
      county: row.county,
      ward: row.ward,
      farmer: row.farmer_name,
      postedAt: row.created_at,
    }));
    const farmers = registrations.filter((row) => row.role === "farmer").length;
    const buyers = registrations.filter((row) => row.role === "buyer").length;

    res.json({
      peopleSummary: {
        total: registrations.length,
        farmers,
        buyers,
        awaitingId: registrations.filter((row) => row.state === "pending").length,
        restricted: registrations.filter((row) => row.state === "limited").length,
        ussdShare: 0,
        gmv: 0,
        countiesCovered: new Set(registrations.map((row) => row.county).filter(Boolean)).size,
        countiesTotal: 47,
        newestJoinedAt: registrations[0]?.joinedAt ?? null,
      },
      signupsByDay: [],
      countyBreakdown: [],
      registrations,
      listings,
      settlements: [],
      moderationQueue: [],
      systemChecks: [],
      opsSummary: {
        held: 0,
        releasing: 0,
        failed: 0,
        feesToday: 0,
        flags: 0,
        urgentFlags: 0,
        degraded: 0,
        openLots: listings.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/admin/account-state", async (req, res) => {
  try {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    const { profileId, state } = req.body;
    await pool.query("UPDATE users SET state = $1 WHERE id = $2", [state, profileId]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/admin/resolve-flag", async (req, res) => {
  const staff = await requireStaff(req, res);
  if (!staff) return;
  res.json({ success: true });
});

app.post("/api/admin/stop-listing", async (req, res) => {
  try {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    const { flagId } = req.body;
    await pool.query("UPDATE listings SET status = 'stopped' WHERE id = $1", [flagId]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});