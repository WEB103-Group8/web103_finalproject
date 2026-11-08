import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Onboarding() {
  const { user, setUser } = useAuth()
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
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to Orbit</h1>
      <p style={styles.subtitle}>Tell us a bit about yourself to get started</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Display name
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Your name"
          />
        </label>
        <label style={styles.label}>
          City
          <input
            name="city"
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
            <option value="" disabled>
              Select one
            </option>
            <option value="attendee">Attendee — I want to discover events</option>
            <option value="host">Host — I want to create and manage events</option>
          </select>
        </label>
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? 'Saving…' : 'Get started'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '0.75rem',
    padding: '2rem',
  },
  title: { fontSize: '2rem', margin: 0 },
  subtitle: { color: '#666', margin: 0 },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
    maxWidth: '420px',
    marginTop: '1rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontWeight: 500,
    fontSize: '0.9rem',
    width: '100%',
    textAlign: 'left',
  },
  input: {
    padding: '0.6rem 0.75rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  button: {
    padding: '0.75rem',
    background: '#24292e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  error: { color: '#c0392b', margin: 0, fontSize: '0.9rem' },
}
