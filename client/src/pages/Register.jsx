import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../css/Auth.css'
import orbitLogo from '../assets/orbit-logo.png'

export default function Register() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    city: '',
    user_type: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }
      window.location.href = '/'
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <Link className="orbit-logo" to="/" aria-label="Orbit home">
                <img src={orbitLogo} alt="Orbit" />
        </Link>
        <Link to="/" className="auth-brand">
          ORBIT
        </Link>
      </nav>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-eyebrow">WELCOME TO ORBIT</span>

            <h1>Create Account</h1>

            <p>
              Join your local community and discover events near you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Full Name

              <input
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange}
                required
                className="auth-input"
                placeholder="Your Name"
                autoComplete="name"
              />
            </label>

            <label className="auth-label">
              Email

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="auth-input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="auth-label">
              Password

              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                className="auth-input"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </label>

            <label className="auth-label">
              City

              <input
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                required
                className="auth-input"
                placeholder="e.g. San Francisco"
              />
            </label>

            <label className="auth-label">
              I am primarily a…

              <select
                name="user_type"
                value={form.user_type}
                onChange={handleChange}
                required
                className="auth-input"
              >
                <option value="" disabled>
                  Select one
                </option>

                <option value="attendee">
                  Attendee — I want to discover events
                </option>

                <option value="host">
                  Host — I want to create and manage events
                </option>
              </select>
            </label>

            {error && (
              <p className="auth-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="auth-button"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
