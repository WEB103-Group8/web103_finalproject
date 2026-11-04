import { pool } from "../config/database.js";

const list = async (req, res) => {
  try {
    const values = [];
    const filters = [];
    if (req.query.city) {
      values.push(req.query.city);
      filters.push(`u.city ILIKE $${values.length}`);
      values[values.length - 1] = `%${values.at(-1)}%`;
    }
    if (req.query.event_type) {
      values.push(req.query.event_type);
      filters.push(`e.event_type ILIKE $${values.length}`);
      values[values.length - 1] = `%${values.at(-1)}%`;
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT e.*, u.full_name AS host_name, u.user_image_url AS host_image_url,
              u.city AS host_city,
              count(r.rsvp_id) FILTER (WHERE r.rsvp_status = 'attending')::int AS rsvp_count
       FROM events e
       JOIN users u ON u.user_id = e.host_user_id
       LEFT JOIN rsvp r ON r.event_id = e.event_id
       ${where}
       GROUP BY e.event_id, u.user_id
       ORDER BY e.event_date, e.event_start_time`,
      values,
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch events:", error.code || error.message);
    return res.status(500).json({ error: "Unable to fetch events." });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.full_name AS host_name, u.user_image_url AS host_image_url,
              count(r.rsvp_id) FILTER (WHERE r.rsvp_status = 'attending')::int AS rsvp_count
       FROM events e
       JOIN users u ON u.user_id = e.host_user_id
       LEFT JOIN rsvp r ON r.event_id = e.event_id
       WHERE e.event_id = $1
       GROUP BY e.event_id, u.user_id`,
      [req.params.eventId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to fetch event:", error.code || error.message);
    return res.status(500).json({ error: "Unable to fetch event." });
  }
};

export default { list, getById };
