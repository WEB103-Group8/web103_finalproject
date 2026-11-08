import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, logout } = useAuth()

  return (
    <div style={styles.container}>
      <h1>Welcome back, {user?.full_name || user?.github_username}!</h1>
      <p>You&apos;re signed in as a <strong>{user?.user_type}</strong> from <strong>{user?.city}</strong>.</p>
      <button onClick={logout} style={styles.button}>Sign out</button>
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
    gap: '1rem',
  },
  button: {
    padding: '0.5rem 1rem',
    background: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
  },
}
