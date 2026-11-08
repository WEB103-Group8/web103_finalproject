import { pool as defaultPool } from '../config/database.js'
import { sendDatabaseError } from '../utils/http.js'

// the database can be swapped out, so tests never need a real one
const createCategoriesController = ({ pool = defaultPool } = {}) => {
    // every category that a group uses, so a category added with a new group shows up for everyone
    const getCategories = async (req, res) => {
        try {
            const results = await pool.query('SELECT DISTINCT category FROM groups ORDER BY category ASC')
            res.status(200).json(results.rows.map((row) => row.category))
        } catch (error) {
            sendDatabaseError(res, 'fetch the categories', error)
        }
    }

    return { getCategories }
}

export { createCategoriesController }
export default createCategoriesController()
