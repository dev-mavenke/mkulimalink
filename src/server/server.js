
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

// Allows base64 image uploads from the transporter registration form.
app.use(express.json({ limit: "4mb" }));

// =====================================================
// SESSION HELPERS
// =====================================================

function readCookie(req, name) {
  const raw = req.headers.cookie ?? "";
  const match = raw
    .split(";")
    .find((part) => part.trim().startsWith(`${name}=`));

  return match
    ? decodeURIComponent(match.split("=").slice(1).join("="))
    : null;
}

function setSession(res, userId) {
  const token = crypto.randomBytes(24).toString("hex");

  sessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_MS,
  });

  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MS,
    path: "/",
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

function requireSignedInUser(req, res) {
  const userId = currentUserId(req);

  if (!userId) {
    res.status(401).json({ message: "Sign in required" });
    return null;
  }

  return String(userId);
}

// =====================================================
// PASSWORD HELPERS
// =====================================================

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) =>
      err ? reject(err) : resolve(key.toString("hex")),
    );
  });

  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  if (typeof stored !== "string" || !stored.includes(":")) {
    return false;
  }

  const [salt, hash] = stored.split(":");

  const next = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) =>
      err ? reject(err) : resolve(key.toString("hex")),
    );
  });

  const expectedBuffer = Buffer.from(hash, "hex");
  const actualBuffer = Buffer.from(next, "hex");

  if (
    expectedBuffer.length !== actualBuffer.length ||
    expectedBuffer.length !== 64
  ) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

// =====================================================
// USER HELPERS
// =====================================================

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
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

async function requireStaff(req, res) {
  const userId = currentUserId(req);

  if (!userId) {
    res.status(401).json({ message: "Sign in required" });
    return null;
  }

  const result = await pool.query(
    "SELECT id, is_staff FROM users WHERE id = $1",
    [userId],
  );

  const row = result.rows[0];

  if (!row?.is_staff) {
    res.status(403).json({ message: "Staff only" });
    return null;
  }

  return row;
}

// =====================================================
// TRANSPORTER / TRUCK HELPERS
// =====================================================

function toTruck(row) {
  return {
    id: row.id,
    driverPhone: row.driver_phone,
    driverName: row.driver_name,
    capacity: row.capacity,
    currentLocation: row.current_location,
    availableFrom: row.available_from,
    pricePerKm:
      row.price_per_km == null ? null : Number(row.price_per_km),
    status: row.status,
    numberPlate: row.number_plate,
    passportPhotoUrl: row.passport_photo_url,
  };
}

// Public truck response. Does not expose the owner's user ID.
function toPublicTruck(row) {
  return {
    id: row.id,
    driverPhone: row.driver_phone,
    driverName: row.driver_name,
    capacity: row.capacity,
    currentLocation: row.current_location,
    availableFrom: row.available_from,
    pricePerKm:
      row.price_per_km == null ? null : Number(row.price_per_km),
    status: row.status,
    numberPlate: row.number_plate,
    passportPhotoUrl: row.passport_photo_url,
  };
}

function validateTruck(form) {
  if (!form || typeof form !== "object" || Array.isArray(form)) {
    return "A valid truck object is required";
  }

  const required = [
    ["driver_phone", 10],
    ["driver_name", 150],
    ["capacity", 50],
    ["current_location", 255],
    ["number_plate", 30],
  ];

  for (const [field, maxLength] of required) {
    if (
      typeof form[field] !== "string" ||
      form[field].trim().length === 0
    ) {
      return `${field} is required`;
    }

    if (field === "driver_phone") {
      if (!/^\d{10}$/.test(form[field].trim())) {
        return "Driver phone number must contain exactly 10 digits";
      }
    } else if (form[field].trim().length > maxLength) {
      return `${field} must be at most ${maxLength} characters`;
    }
  }

  if (
    form.status !== undefined &&
    !["available", "booked"].includes(form.status)
  ) {
    return "Status must be available or booked";
  }

  if (
    form.price_per_km !== undefined &&
    form.price_per_km !== null &&
    (
      form.price_per_km === "" ||
      !Number.isFinite(Number(form.price_per_km)) ||
      Number(form.price_per_km) < 0
    )
  ) {
    return "Price per kilometre must be a non-negative number";
  }

  if (
    form.available_from !== undefined &&
    form.available_from !== null &&
    form.available_from !== ""
  ) {
    if (
      typeof form.available_from !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.available_from)
    ) {
      return "Availability date must use YYYY-MM-DD";
    }

    const date = new Date(`${form.available_from}T00:00:00Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== form.available_from
    ) {
      return "Invalid availability date";
    }
  }

  const photo = form.passport_photo_url;

  if (photo !== undefined && photo !== null && photo !== "") {
    if (typeof photo !== "string") {
      return "Driver photo must be a valid image";
    }

    const isHttpsUrl =
      /^https:\/\/[^\s]+$/i.test(photo) &&
      photo.length <= 2048;

    const isImageDataUrl =
      /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        photo,
      ) &&
      photo.length <= 3 * 1024 * 1024;

    if (!isHttpsUrl && !isImageDataUrl) {
      return "Upload a valid image (JPEG, PNG, WebP or GIF) up to 2 MB";
    }
  }

  return null;
}

const truckColumns = `
  id, driver_phone, driver_name, capacity, current_location,
  available_from, price_per_km, status, number_plate,
  passport_photo_url
`;

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "MkulimaLink backend is connected to Neon!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// =====================================================
// AUTHENTICATION
// =====================================================

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Enter a valid name and email, and a password of at least 8 characters",
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, account_no)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, account_no, role, state, county, is_staff`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        `u-${crypto.randomUUID()}`,
      ],
    );

    const row = result.rows[0];

    setSession(res, row.id);

    res.status(201).json({
      user: toUser(row),
      profile: toProfile(row),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with that email already exists",
      });
    }

    console.error("Signup error:", error);
    res.status(400).json({ message: "Could not create account" });
  }
});

app.post("/api/signin", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, account_no,
              role, state, county, is_staff
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    const row = result.rows[0];

    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return res.status(401).json({
        message: "Wrong email or password",
      });
    }

    setSession(res, row.id);

    res.json({
      user: toUser(row),
      profile: toProfile(row),
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Could not sign in" });
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const userId = currentUserId(req);

    if (!userId) {
      return res.json({ user: null, profile: null });
    }

    const result = await pool.query(
      `SELECT id, name, email, account_no, role, state, county, is_staff
       FROM users
       WHERE id = $1`,
      [userId],
    );

    const row = result.rows[0];

    if (!row) {
      return res.json({ user: null, profile: null });
    }

    res.json({
      user: toUser(row),
      profile: toProfile(row),
    });
  } catch (error) {
    console.error("Current user error:", error);
    res.status(500).json({ message: "Could not load current user" });
  }
});

app.post("/api/signout", (req, res) => {
  const token = readCookie(req, "session");

  if (token) sessions.delete(token);

  res.clearCookie("session", { path: "/" });
  res.json({ success: true });
});

// =====================================================
// MARKETPLACE
// =====================================================

app.get("/api/market", async (req, res) => {
  try {
    const board = await pool.query(
      `SELECT crop_id, crop_name, category, unit_short, unit_kg, price,
              broker_price, change, uplift, board_date
       FROM board_prices
       ORDER BY board_date DESC`,
    );

    const lots = await pool.query(
      `SELECT id, crop_id, grade_id, quantity, price, county, ward,
              ready_in_days, note, created_at, farmer_name
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
        farmer: {
          name: row.farmer_name,
          lots: 0,
          rating: null,
        },
        readyIn: row.ready_in_days,
        note: row.note,
        postedAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Market error:", error);
    res.status(500).json({ message: "Could not load marketplace" });
  }
});

app.post("/api/listings", async (req, res) => {
  try {
    const userId = currentUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Sign in required" });
    }

    const account = await pool.query(
      "SELECT is_staff FROM users WHERE id = $1",
      [userId],
    );

    if (account.rows[0]?.is_staff) {
      return res.status(403).json({
        message: "Staff cannot post a harvest",
      });
    }

    const form = req.body ?? {};

    const result = await pool.query(
      `INSERT INTO listings
        (farmer_id, farmer_name, crop_id, grade_id, quantity, price,
         county, ward, ready_in_days, note)
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

    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(400).json({ message: "Could not create listing" });
  }
});

// =====================================================
// TRANSPORTER MODULE — TRUCKS
// =====================================================

// PUBLIC DIRECTORY — no sign-in required.
// This route must be declared before /api/trucks/:id.

app.get("/api/trucks/public", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         driver_phone,
         driver_name,
         capacity,
         current_location,
         available_from,
         price_per_km,
         status,
         number_plate,
         passport_photo_url
       FROM trucks
       WHERE status = 'available'
       ORDER BY id DESC`,
    );

    res.json({
      trucks: result.rows.map(toPublicTruck),
    });
  } catch (error) {
    console.error("Public truck directory error:", error);
    res.status(500).json({
      message: "Could not load available trucks",
    });
  }
});

// GET /api/trucks — list trucks belonging to signed-in user.

app.get("/api/trucks", async (req, res) => {
  try {
    const userId = requireSignedInUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      `SELECT ${truckColumns}
       FROM trucks
       WHERE created_by = $1
       ORDER BY id DESC`,
      [userId],
    );

    res.json({ trucks: result.rows.map(toTruck) });
  } catch (error) {
    console.error("List trucks error:", error);
    res.status(500).json({ message: "Could not load trucks" });
  }
});

// GET /api/trucks/:id — get one truck owned by the signed-in user.

app.get("/api/trucks/:id", async (req, res) => {
  try {
    const userId = requireSignedInUser(req, res);
    if (!userId) return;

    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid truck ID" });
    }

    const result = await pool.query(
      `SELECT ${truckColumns}
       FROM trucks
       WHERE id = $1 AND created_by = $2`,
      [req.params.id, userId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Truck not found" });
    }

    res.json({ truck: toTruck(result.rows[0]) });
  } catch (error) {
    console.error("Get truck error:", error);
    res.status(500).json({ message: "Could not load truck" });
  }
});

// POST /api/trucks — register a truck.

app.post("/api/trucks", async (req, res) => {
  try {
    const userId = requireSignedInUser(req, res);
    if (!userId) return;

    const form = req.body ?? {};
    const validationError = validateTruck(form);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await pool.query(
      `INSERT INTO trucks
        (driver_phone, driver_name, capacity, current_location,
         available_from, price_per_km, status, number_plate,
         passport_photo_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING ${truckColumns}`,
      [
        form.driver_phone.trim(),
        form.driver_name.trim(),
        form.capacity.trim(),
        form.current_location.trim(),
        form.available_from || null,
        form.price_per_km ?? null,
        form.status || "available",
        form.number_plate.trim().toUpperCase(),
        form.passport_photo_url || null,
        userId,
      ],
    );

    res.status(201).json({
      truck: toTruck(result.rows[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "That number plate is already registered",
      });
    }

    console.error("Create truck error:", error);
    res.status(500).json({ message: "Could not register truck" });
  }
});

// PUT /api/trucks/:id — update an owned truck.

app.put("/api/trucks/:id", async (req, res) => {
  try {
    const userId = requireSignedInUser(req, res);
    if (!userId) return;

    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid truck ID" });
    }

    const form = req.body ?? {};
    const validationError = validateTruck(form);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await pool.query(
      `UPDATE trucks
       SET driver_phone = $1,
           driver_name = $2,
           capacity = $3,
           current_location = $4,
           available_from = $5,
           price_per_km = $6,
           status = $7,
           number_plate = $8,
           passport_photo_url = $9
       WHERE id = $10 AND created_by = $11
       RETURNING ${truckColumns}`,
      [
        form.driver_phone.trim(),
        form.driver_name.trim(),
        form.capacity.trim(),
        form.current_location.trim(),
        form.available_from || null,
        form.price_per_km ?? null,
        form.status || "available",
        form.number_plate.trim().toUpperCase(),
        form.passport_photo_url || null,
        req.params.id,
        userId,
      ],
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        message: "Truck not found or you do not own it",
      });
    }

    res.json({ truck: toTruck(result.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "That number plate is already registered",
      });
    }

    console.error("Update truck error:", error);
    res.status(500).json({ message: "Could not update truck" });
  }
});

// DELETE /api/trucks/:id — delete an owned truck.

app.delete("/api/trucks/:id", async (req, res) => {
  try {
    const userId = requireSignedInUser(req, res);
    if (!userId) return;

    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid truck ID" });
    }

    const result = await pool.query(
      `DELETE FROM trucks
       WHERE id = $1 AND created_by = $2
       RETURNING id`,
      [req.params.id, userId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        message: "Truck not found or you do not own it",
      });
    }

    res.json({
      success: true,
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Delete truck error:", error);
    res.status(500).json({ message: "Could not delete truck" });
  }
});

// =====================================================
// ADMIN
// =====================================================

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
      `SELECT id, crop_id, grade_id, quantity, price, county, ward,
              farmer_name, created_at
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

    const farmers = registrations.filter(
      (row) => row.role === "farmer",
    ).length;

    const buyers = registrations.filter(
      (row) => row.role === "buyer",
    ).length;

    res.json({
      peopleSummary: {
        total: registrations.length,
        farmers,
        buyers,
        awaitingId: registrations.filter(
          (row) => row.state === "pending",
        ).length,
        restricted: registrations.filter(
          (row) => row.state === "limited",
        ).length,
        ussdShare: 0,
        gmv: 0,
        countiesCovered: new Set(
          registrations.map((row) => row.county).filter(Boolean),
        ).size,
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
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Could not load admin dashboard" });
  }
});

app.post("/api/admin/account-state", async (req, res) => {
  try {
    const staff = await requireStaff(req, res);
    if (!staff) return;

    const { profileId, state } = req.body ?? {};

    if (!profileId || !["active", "pending", "limited"].includes(state)) {
      return res.status(400).json({
        message: "A valid profile ID and account state are required",
      });
    }

    await pool.query(
      "UPDATE users SET state = $1 WHERE id = $2",
      [state, profileId],
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Account state error:", error);
    res.status(400).json({ message: "Could not update account state" });
  }
});

app.post("/api/admin/resolve-flag", async (req, res) => {
  try {
    const staff = await requireStaff(req, res);
    if (!staff) return;

    res.json({ success: true });
  } catch (error) {
    console.error("Resolve flag error:", error);
    res.status(500).json({ message: "Could not resolve flag" });
  }
});

app.post("/api/admin/stop-listing", async (req, res) => {
  try {
    const staff = await requireStaff(req, res);
    if (!staff) return;

    const { flagId } = req.body ?? {};

    if (!flagId) {
      return res.status(400).json({ message: "flagId is required" });
    }

    await pool.query(
      "UPDATE listings SET status = 'stopped' WHERE id = $1",
      [flagId],
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Stop listing error:", error);
    res.status(400).json({ message: "Could not stop listing" });
  }
});

// =====================================================
// JSON ERROR HANDLER
// =====================================================

// Return a useful response if the request body exceeds the JSON limit.
app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Upload is too large. Choose an image under 2 MB.",
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Invalid JSON request body" });
  }

  next(error);
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});