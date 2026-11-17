import { createContext, useContext, useEffect, useState } from 'react'
import { request } from '../utils/request'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // fetch('/auth/me', { credentials: 'include' })
    request('/auth/me')
      // .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch((error) => {
        if (error.status === 401) {
          setUser(null)
          return
        }

        console.error('Failed to load session:', error)
        setUser(null)
      })

      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await request('/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
