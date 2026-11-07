import { pool } from './database.js'

const migrate = async () => {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id TEXT UNIQUE`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username TEXT`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE`)
  // Allow NULL on columns filled in during onboarding (new OAuth users won't have these yet)
  await pool.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`)
  await pool.query(`ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL`)
  await pool.query(`ALTER TABLE users ALTER COLUMN city DROP NOT NULL`)
  await pool.query(`ALTER TABLE users ALTER COLUMN user_type DROP NOT NULL`)
  console.log('Migration complete')
  await pool.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
