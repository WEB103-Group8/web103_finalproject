import { pool } from "../config/database.js";

const list = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, full_name, email, city, user_image_url, user_type
       FROM users
       ORDER BY user_id`,
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch users:", error.code || error.message);
    res.status(500).json({ error: "Unable to fetch users." });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, full_name, email, city, user_image_url, user_type
       FROM users WHERE user_id = $1`,
      [req.params.userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = result.rows[0];
    const [createdEvents, rsvpedEvents] = await Promise.all([
      pool.query(
        `SELECT * FROM events WHERE host_user_id = $1 ORDER BY event_date`,
        [req.params.userId],
      ),
      pool.query(
        `SELECT e.*, r.rsvp_status
         FROM rsvp r
         JOIN events e ON e.event_id = r.event_id
         WHERE r.user_id = $1
         ORDER BY e.event_date`,
        [req.params.userId],
      ),
    ]);

    return res.status(200).json({
      ...user,
      created_events: createdEvents.rows,
      rsvped_events: rsvpedEvents.rows,
    });
  } catch (error) {
    console.error("Failed to fetch user:", error.code || error.message);
    return res.status(500).json({ error: "Unable to fetch user." });
  }
};

export default { list, getById };
