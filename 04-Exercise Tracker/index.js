// index.js — memory-only Exercise Tracker (no DB)
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

// In-memory stores
const users = {}; // _id -> { username, _id }
const logs = {};  // _id -> [ { description, duration, date } ]

const makeId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2,8));

/**
 * Create user
 * POST /api/users
 * Body: { username }
 * Response: { username, _id }
 */
app.post("/api/users", (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: "username required" });

  const _id = makeId();
  users[_id] = { username, _id };
  logs[_id] = [];
  res.json(users[_id]);
});

/**
 * Get all users
 * GET /api/users
 * Response: [ { username, _id }, ... ]
 */
app.get("/api/users", (req, res) => {
  res.json(Object.values(users));
});

/**
 * Add exercise
 * POST /api/users/:_id/exercises
 * Body: { description, duration, date? }
 * Response: { username, description, duration, date, _id }
 */
app.post("/api/users/:_id/exercises", (req, res) => {
  const { _id } = req.params;
  const user = users[_id];
  if (!user) return res.status(400).json({ error: "unknown _id" });

  const description = req.body.description;
  const duration = Number(req.body.duration);
  const dateRaw = req.body.date;

  if (!description || !req.body.duration) {
    return res.status(400).json({ error: "description and duration required" });
  }
  if (isNaN(duration)) return res.status(400).json({ error: "duration must be a number" });

  const dateObj = dateRaw ? new Date(dateRaw) : new Date();
  if (dateObj.toString() === "Invalid Date") return res.status(400).json({ error: "invalid date" });

  const date = dateObj.toDateString();

  const entry = { description, duration, date };
  logs[_id].push(entry);

  res.json({ username: user.username, description, duration, date, _id: user._id });
});

/**
 * Get logs
 * GET /api/users/:_id/logs[?from&to&limit]
 * Response: { username, count, _id, log: [ { description, duration, date } ] }
 */
app.get("/api/users/:_id/logs", (req, res) => {
  const { _id } = req.params;
  const user = users[_id];
  if (!user) return res.status(400).json({ error: "unknown _id" });

  let userLogs = logs[_id] || [];
  const { from, to, limit } = req.query;

  if (from) {
    const fromDate = new Date(from);
    if (fromDate.toString() !== "Invalid Date") {
      userLogs = userLogs.filter(l => new Date(l.date) >= fromDate);
    }
  }
  if (to) {
    const toDate = new Date(to);
    if (toDate.toString() !== "Invalid Date") {
      userLogs = userLogs.filter(l => new Date(l.date) <= toDate);
    }
  }
  if (limit) {
    const n = Number(limit);
    if (!isNaN(n)) userLogs = userLogs.slice(0, n);
  }

  // ensure dates are toDateString()
  const logNormalized = userLogs.map(l => ({
    description: l.description,
    duration: l.duration,
    date: new Date(l.date).toDateString()
  }));

  res.json({ username: user.username, count: userLogs.length, _id: user._id, log: logNormalized });
});

// fallback port auto-increment if 3000 busy
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const start = () => {
  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${server.address().port}`);
  });
  server.on("error", err => {
    if (err.code === "EADDRINUSE") {
      console.warn(`Port ${PORT} in use - trying ${PORT + 1}`);
      app.listen(PORT + 1, () => console.log(`Server listening on port ${PORT + 1}`));
    } else {
      throw err;
    }
  });
};
start();
