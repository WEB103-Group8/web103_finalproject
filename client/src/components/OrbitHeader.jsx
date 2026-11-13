import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import '../css/OrbitHeader.css'
import orbitLogo from '../assets/orbit-logo.png'

// the top bar: its links depend on whether the person is a visitor, an attendee or a host
const OrbitHeader = () => {
  const { user, signOut, loading } = useSession()
  const navigate = useNavigate()

  // which dropdown is open: 'create' (the + button of hosts), 'account' (the avatar), or none
  const [openMenu, setOpenMenu] = useState(null)

  // a dropdown closes when the person clicks anywhere else on the page, or presses Escape
  useEffect(() => {
    if (!openMenu) return undefined

    const closeOnOutsideClick = (event) => {
      if (!event.target.closest('[data-menu-root]')) setOpenMenu(null)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenu])

  // open a dropdown, or close it when it is already open
  const toggleMenu = (name) => setOpenMenu(openMenu === name ? null : name)

  // log out, close the menu and go back to the welcome page
  const handleSignOut = async () => {
    await signOut()
    setOpenMenu(null)
    navigate('/')
  }

  return (
    <header className="orbit-header">

      <Link className="orbit-logo" to="/" aria-label="Orbit home">
        <img src={orbitLogo} alt="Orbit" />
      </Link>

      <nav className="orbit-nav" aria-label="Main">
        <NavLink className="orbit-nav-link" to="/" end>Home</NavLink>
        <NavLink className="orbit-nav-link" to="/events">Events</NavLink>
        <NavLink className="orbit-nav-link" to="/groups">Groups</NavLink>
        {user && <NavLink className="orbit-nav-link" to="/collection">My Collection</NavLink>}
      </nav>

      {/* nothing is shown on the right until we know who is logged in, so a logged-in person never sees the visitor buttons for a moment */}
      <div className="orbit-actions">
        {!loading && (
          <>
            {/* visitors get the same + button, which sends them to log in first */}
            {!user && (
              <Link
                className="orbit-create" to="/login" aria-label="Create">
                +
              </Link>
            )}

            {/* hosts get a + button that opens a dropdown to create an event or a group */}
            {user?.is_host && (
              <div className="orbit-menu" data-menu-root>
                <button type="button" className="orbit-create" aria-label="Create" aria-haspopup="true" aria-expanded={openMenu === 'create'} onClick={() => toggleMenu('create')}>
                  +
                </button>

                {openMenu === 'create' && (
                  <div className="orbit-menu-list">
                    <Link to="/events/new" onClick={() => setOpenMenu(null)}>
                      Create Event
                    </Link>
                    <Link to="/groups/new" onClick={() => setOpenMenu(null)}>
                      Create Group
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!user && (
              <Link className="orbit-login" to="/login">
                Log In
              </Link>
            )}

            {user && (
              <div className="orbit-menu" data-menu-root>
                <button type="button" className="orbit-avatar" aria-label="Account menu" aria-expanded={openMenu === 'account'} onClick={() => toggleMenu('account')}>
                  {user.user_image_url ? <img src={user.user_image_url} alt="" /> : <span>{user.full_name?.[0] ?? '?'}</span>}
                </button>

                {openMenu === 'account' && (
                  <div className="orbit-menu-list">
                    <Link to="/profile" onClick={() => setOpenMenu(null)}>
                      My Profile
                    </Link>
                    <button type="button" onClick={handleSignOut}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  )
}

export default OrbitHeader
