import { useState } from 'react'
import { Link } from 'react-router-dom'

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
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.brand}>Orbit</span>
      </nav>
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.title}>Create account</h1>

          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Full name
              <input
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label style={styles.label}>
              Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label style={styles.label}>
              Password
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                style={styles.input}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </label>
            <label style={styles.label}>
              City
              <input
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="e.g. San Francisco"
              />
            </label>
            <label style={styles.label}>
              I am primarily a…
              <select
                name="user_type"
                value={form.user_type}
                onChange={handleChange}
                required
                style={styles.input}
              >
                <option value="" disabled>Select one</option>
                <option value="attendee">Attendee — I want to discover events</option>
                <option value="host">Host — I want to create and manage events</option>
              </select>
            </label>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={submitting} style={styles.button}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p style={styles.footer}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#f9f9f9',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid #e5e5e5',
    background: '#fff',
  },
  brand: { fontSize: '1.5rem', fontWeight: 700 },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    fontWeight: 500,
    fontSize: '0.9rem',
  },
  input: {
    padding: '0.6rem 0.75rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  button: {
    padding: '0.7rem',
    background: '#24292e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  footer: { textAlign: 'center', fontSize: '0.9rem', color: '#555', margin: 0 },
  link: { color: '#24292e', fontWeight: 600 },
  error: { color: '#c0392b', margin: 0, fontSize: '0.875rem' },
}
