import { pool } from "../config/database.js";

const list = async (req, res) => {
  try {
    const userId = req.query.user_id;
    const eventId = req.query.event_id;
    if (!userId && !eventId) {
      return res
        .status(400)
        .json({ error: "Provide user_id or event_id to query RSVPs." });
    }

    const values = [];
    const filters = [];
    if (userId) {
      values.push(userId);
      filters.push(`r.user_id = $${values.length}`);
    }
    if (eventId) {
      values.push(eventId);
      filters.push(`r.event_id = $${values.length}`);
    }
    const result = await pool.query(
      `SELECT r.rsvp_id, r.user_id, r.event_id, r.rsvp_status,
              u.full_name, e.event_title, e.event_date, e.event_start_time
       FROM rsvp r
       JOIN users u ON u.user_id = r.user_id
       JOIN events e ON e.event_id = r.event_id
       WHERE ${filters.join(" AND ")}
       ORDER BY e.event_date, e.event_start_time`,
      values,
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch RSVPs:", error.code || error.message);
    return res.status(500).json({ error: "Unable to fetch RSVPs." });
  }
};

export default { list };
