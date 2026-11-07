import { pool } from '../config/database.js'

export const getMe = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  res.json(req.user)
}

export const handleCallback = (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  if (req.user.isNewUser) {
    return res.redirect(`${clientUrl}/onboarding`)
  }
  res.redirect(clientUrl)
}

export const logout = (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' })
    res.json({ message: 'Logged out' })
  })
}

export const completeOnboarding = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  if (!req.user.isNewUser) {
    return res.status(400).json({ error: 'User already onboarded' })
  }

  const { full_name, city, user_type } = req.body

  if (!full_name || !city || !user_type) {
    return res.status(400).json({ error: 'full_name, city, and user_type are required' })
  }
  if (!['host', 'attendee'].includes(user_type)) {
    return res.status(400).json({ error: 'user_type must be "host" or "attendee"' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (github_id, github_username, email, user_image_url, full_name, city, user_type, is_onboarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [
        req.user.github_id,
        req.user.github_username,
        req.user.email,
        req.user.avatar_url,
        full_name,
        city,
        user_type,
      ]
    )

    const newUser = result.rows[0]
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ error: 'Session error after onboarding' })
      res.json(newUser)
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create user' })
  }
}
