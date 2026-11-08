import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate(user.is_onboarded ? '/' : '/onboarding', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.brand}>Orbit</span>
        <a href="/auth/github" style={styles.button}>
          Sign in with GitHub
        </a>
      </nav>
      <main style={styles.main}>
        <p>homepage will go here</p>
      </main>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    borderBottom: '1px solid #e5e5e5',
  },
  brand: { fontSize: '1.5rem', fontWeight: 700 },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    padding: '0.6rem 1.25rem',
    background: '#24292e',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 600,
  },
}
