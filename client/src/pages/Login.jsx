import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import '../css/Auth.css'
import orbitLogo from '../assets/orbit-logo.png'

export default function Login() {
  const { user, loading, setUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate(user.is_onboarded ? '/' : '/onboarding', { replace: true })
    }
  }, [user, loading, navigate])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      setUser(data)
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
          orbit
        </Link>


        {/* light and dark mode toggle */}
        <button
          type="button"
          className="auth-theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '☾' : '☀'}
        </button>

      </nav>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-eyebrow">WELCOME BACK</span>

            <h1>Sign in</h1>

            <p>
              Sign in to discover events and connect with your community.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
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
                className="auth-input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
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
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </div>

          <a
            href="/auth/github"
            className="auth-github"
          >
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>

            Sign in with GitHub
          </a>

          <p className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
