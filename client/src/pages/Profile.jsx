import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, logout } = useAuth()

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.navLink}>← Back to Home</Link>
      </nav>

      <div style={styles.card}>
        <div style={styles.avatarWrapper}>
          {user?.user_image_url ? (
            <img src={user.user_image_url} alt={user.full_name} style={styles.avatar} />
          ) : (
            <div style={styles.avatarFallback}>
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>

        <h1 style={styles.name}>{user?.full_name}</h1>
        <p style={styles.username}>@{user?.github_username}</p>

        <div style={styles.badges}>
          <span style={styles.badge}>{user?.user_type}</span>
          <span style={styles.badge}>{user?.city}</span>
        </div>

        {user?.email && (
          <p style={styles.email}>{user.email}</p>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>RSVPs</h2>
        <p style={styles.placeholder}>Events you RSVP to will appear here.</p>
      </div>

      <button onClick={logout} style={styles.logoutButton}>Sign out</button>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 1rem',
    gap: '1.5rem',
    minHeight: '100vh',
  },
  nav: {
    width: '100%',
    maxWidth: '480px',
    textAlign: 'left',
  },
  navLink: {
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    boxSizing: 'border-box',
  },
  avatarWrapper: {
    marginBottom: '0.5rem',
  },
  avatar: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid var(--accent)',
  },
  avatarFallback: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    background: 'var(--accent-bg)',
    border: '3px solid var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    fontWeight: 600,
    color: 'var(--accent)',
  },
  name: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 600,
    color: 'var(--text-h)',
    letterSpacing: '-0.5px',
  },
  username: {
    margin: 0,
    color: 'var(--text)',
    fontSize: '0.95rem',
  },
  badges: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    background: 'var(--accent-bg)',
    border: '1px solid var(--accent-border)',
    color: 'var(--accent)',
    fontSize: '0.85rem',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  email: {
    margin: 0,
    color: 'var(--text)',
    fontSize: '0.9rem',
  },
  sectionTitle: {
    margin: '0 0 0.25rem',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-h)',
    alignSelf: 'flex-start',
  },
  placeholder: {
    color: 'var(--text)',
    fontSize: '0.9rem',
    alignSelf: 'flex-start',
  },
  logoutButton: {
    padding: '0.5rem 1.5rem',
    background: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.9rem',
  },
}
