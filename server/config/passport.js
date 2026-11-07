import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { pool } from './database.js'

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL || 'http://localhost:5173/auth/github/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existing = await pool.query(
          'SELECT * FROM users WHERE github_id = $1',
          [String(profile.id)]
        )

        if (existing.rows.length > 0) {
          return done(null, existing.rows[0])
        }

        // New user — store GitHub profile in session, don't insert yet
        return done(null, {
          isNewUser: true,
          github_id: String(profile.id),
          github_username: profile.username,
          email: profile.emails?.[0]?.value || null,
          avatar_url: profile.photos?.[0]?.value || null,
        })
      } catch (err) {
        return done(err)
      }
    }
  )
)

passport.serializeUser((user, done) => {
  if (user.isNewUser) {
    done(null, { isNewUser: true, github_id: user.github_id, github_username: user.github_username, email: user.email, avatar_url: user.avatar_url })
  } else {
    done(null, user.user_id)
  }
})

passport.deserializeUser(async (data, done) => {
  if (typeof data === 'object' && data.isNewUser) {
    return done(null, data)
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [data])
    done(null, result.rows[0] || null)
  } catch (err) {
    done(err)
  }
})

export default passport
