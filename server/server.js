import "./config/dotenv.js";
import cors from "cors";
import express from "express";
import { pool } from "./config/database.js";
import EventsRouter from "./routes/events.js";
import RsvpsRouter from "./routes/rsvps.js";
import UsersRouter from "./routes/users.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  return res.status(200).json({
    name: "Orbit API",
    status: "running",
    endpoints: {
      health: "/health",
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

app.use("/users", UsersRouter);
app.use("/events", EventsRouter);
app.use("/rsvp", RsvpsRouter);

app.use((req, res) => {
  return res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

const server = app.listen(port, () => {
  console.log(`Orbit API listening on http://localhost:${port}`);
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