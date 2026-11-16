import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import '../css/Onboarding.css'
import orbitLogo from '../assets/orbit-logo.png'

export default function Onboarding() {
  const { user, setUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    city: user?.city || '',
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
      const res = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setUser(data)
      navigate('/')
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="onboarding-page">
      <nav className="onboarding-nav">
        <Link className="onboarding-logo" to="/" aria-label="Orbit home">
          <img src={orbitLogo} alt="Orbit" />
        </Link>

        <Link to="/" className="onboarding-brand">
          orbit
        </Link>

        <button
          type="button"
          className="onboarding-theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '☾' : '☀'}
        </button>
      </nav>

      <main className="onboarding-main">
        <section className="onboarding-card">
          <div className="onboarding-heading">
            <span className="onboarding-eyebrow">WELCOME TO ORBIT</span>

            <h1>Tell us about yourself</h1>

            <p>
              Tell us a bit about yourself to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="onboarding-form">
            <label className="onboarding-label">
              Display name

              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                className="onboarding-input"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>

            <label className="onboarding-label">
              City

              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="onboarding-input"
                placeholder="e.g. San Francisco"
                autoComplete="address-level2"
              />
            </label>

            <label className="onboarding-label">
              I am primarily a…

              <select
                name="user_type"
                value={form.user_type}
                onChange={handleChange}
                required
                className="onboarding-input"
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
              <p className="onboarding-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="onboarding-button"
            >
              {submitting ? 'Saving…' : 'Get started'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
