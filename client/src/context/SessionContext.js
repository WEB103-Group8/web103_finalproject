import { createContext, useContext } from 'react'

// shared place where every Orbit page can read who is logged in
export const SessionContext = createContext({ user: null, needsOnboarding: false, loading: true, signOut: async () => {}, refresh: async () => {} })

// read the session: { user, needsOnboarding, loading, signOut, refresh }
export const useSession = () => useContext(SessionContext)
