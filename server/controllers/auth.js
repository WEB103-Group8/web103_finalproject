import bcrypt from 'bcryptjs'
import { pool } from '../config/database.js'

export const getMe = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const { password_hash, ...safeUser } = req.user
  res.json(safeUser)
}

export const registerLocal = async (req, res) => {
  const { email, password, full_name, city, user_type } = req.body
  if (!email || !password || !full_name || !city || !user_type) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  if (!['host', 'attendee'].includes(user_type)) {
    return res.status(400).json({ error: 'user_type must be "host" or "attendee"' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const existing = await pool.query('SELECT user_id FROM users WHERE lower(email) = lower($1)', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' })
    }

    const hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, city, user_type, is_onboarded)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING user_id, full_name, email, city, user_type, user_image_url, is_onboarded`,
      [email, hash, full_name, city, user_type]
    )

    const newUser = result.rows[0]
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ error: 'Session error after registration' })
      res.status(201).json(newUser)
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
}

export const loginLocal = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const result = await pool.query(
      `SELECT user_id, full_name, email, city, user_type, user_image_url, is_onboarded, password_hash
       FROM users WHERE lower(email) = lower($1)`,
      [email]
    )

    const user = result.rows[0]
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const { password_hash, ...safeUser } = user
    req.login(safeUser, (err) => {
      if (err) return res.status(500).json({ error: 'Session error' })
      res.json(safeUser)
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
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
