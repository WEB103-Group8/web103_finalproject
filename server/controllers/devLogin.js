import { pool as defaultPool } from '../config/database.js'
import { sendDatabaseError, sendNotFound } from '../utils/http.js'
import { SETTING, requireSetting } from '../utils/settings.js'
import { isValidId } from '../utils/validators.js'

// TEMPORARY, for trying the pages as different people before the real login pages are joined in; removed together with the dev page

// how many people of each kind are offered
const PEOPLE_PER_KIND = 3

// the database can be swapped out, so tests never need a real one
const createDevLoginController = ({ pool = defaultPool } = {}) => {
    // a few seeded hosts and a few seeded attendees to pick from
    const getTestUsers = async (req, res) => {
        try {
            const hostType = requireSetting(SETTING.hostUserType)
            const pick = (condition) =>
                pool.query(`SELECT user_id, full_name, user_type FROM users WHERE ${condition} ORDER BY user_id ASC LIMIT ${PEOPLE_PER_KIND}`, [hostType])

            const [hosts, attendees] = await Promise.all([pick('user_type = $1'), pick('user_type <> $1')])
            res.status(200).json({ hosts: hosts.rows, attendees: attendees.rows })
        } catch (error) {
            sendDatabaseError(res, 'fetch the test users', error)
        }
    }

    // log the browser in as the chosen seeded person, through the same session the real login uses
    const loginAs = async (req, res) => {
        try {
            const userId = req.body?.user_id
            if (!isValidId(userId)) return sendNotFound(res, 'User')

            const results = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId])
            if (results.rows.length === 0) return sendNotFound(res, 'User')

            req.login(results.rows[0], (error) => {
                if (error) return sendDatabaseError(res, 'log in', error)
                res.status(200).json({ user_id: results.rows[0].user_id, full_name: results.rows[0].full_name })
            })
        } catch (error) {
            sendDatabaseError(res, 'log in', error)
        }
    }

    return { getTestUsers, loginAs }
}

export { createDevLoginController }
export default createDevLoginController()
