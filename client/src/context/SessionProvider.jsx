import { useCallback, useEffect, useMemo, useState } from 'react'
import SessionAPI from '../services/SessionAPI'
import { SessionContext } from './SessionContext'

// ask the server who is logged in once, then share the answer with every page below
const SessionProvider = ({ children }) => {
  const [session, setSession] = useState({ user: null, needsOnboarding: false, loading: true })

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

  // log out on the server, then forget the person here
  const signOut = useCallback(async () => {
    await SessionAPI.logout()
    setSession({ user: null, needsOnboarding: false, loading: false })
  }, [])

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
