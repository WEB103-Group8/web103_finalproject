import "./config/dotenv.js";
import cors from "cors";
import express from "express";
import session from "express-session";
import passport from "./config/passport.js";
import { pool } from "./config/database.js";
import authRouter from "./routes/authRoutes.js";
import router from "./routes/routes.js";
import EventsRouter from "./routes/events.js";
import RsvpsRouter from "./routes/rsvps.js";
import UsersRouter from "./routes/users.js";

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_req, res) => {
  return res.status(200).json({
    name: "Orbit API",
    status: "running",
    endpoints: {
      health: "/health",
      auth: "/auth",
      users: "/users",
      events: "/events",
      rsvps: "/rsvp",
    },
  });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database query failed:", error.code || error.message);
    return res.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.use("/auth", authRouter);
app.use("/api", router);
app.use("/users", UsersRouter);
app.use("/events", EventsRouter);
app.use("/rsvp", RsvpsRouter);

app.use((req, res) => {
  return res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

const server = app.listen(PORT, () => {
  console.log(`Orbit API listening on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    pool.end().then(() => process.exit(0)).catch((error) => {
      console.error("Failed to close database pool:", error.code || error.message);
      process.exit(1);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);