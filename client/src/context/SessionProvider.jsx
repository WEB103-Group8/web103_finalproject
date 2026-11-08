import { useCallback, useEffect, useMemo, useState } from 'react'
import SessionAPI from '../services/SessionAPI'
import { useAuth } from './AuthContext'
import { SessionContext } from './SessionContext'

// ask the server who is logged in once, then share the answer with every page below
const SessionProvider = ({ children }) => {
  const [session, setSession] = useState({ user: null, needsOnboarding: false, loading: true })

  // Keep the GitHub login pages in sync when this provider is used inside AuthProvider.
  const setLoginPagesUser = useAuth()?.setUser

  useEffect(() => {
    let active = true

    // if the server cannot be reached, treat the visitor as logged out so the pages still open
    SessionAPI.getSession()
      .catch(() => ({ user: null, needsOnboarding: false }))
      .then((result) => {
        if (active) setSession({ ...result, loading: false })
      })

    return () => {
      active = false
    }
  }, [])

  // log out on the server, then clear both copies of the user so neither part of the app stays signed in
  const signOut = useCallback(async () => {
    await SessionAPI.logout()
    setLoginPagesUser?.(null)
    setSession({ user: null, needsOnboarding: false, loading: false })
  }, [setLoginPagesUser])

  // ask the server again who is logged in, for example after the person changed their name or photo
  const refresh = useCallback(async () => {
    try {
      setSession({ ...(await SessionAPI.getSession()), loading: false })
    } catch {
      // if the server cannot be reached, keep showing what we already know
    }
  }, [])

  const value = useMemo(() => ({ ...session, signOut, refresh }), [session, signOut, refresh])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export default SessionProvider
