import { pool } from '../config/database.js'

const getCities = async (req, res) => {
    try {
        // every city that has a venue, listed once
        const results = await pool.query(`
            SELECT DISTINCT venues.city, venues.state, venues.postal_code AS zipcode
            FROM venues
            ORDER BY venues.state ASC, venues.city ASC`)
        res.status(200).json(results.rows)
    } catch (error) {
        console.error('Failed to fetch cities:', error.code || error.message)
        res.status(500).json({ error: 'Unable to fetch cities.' })
    }
}

export default {
    getCities
}
