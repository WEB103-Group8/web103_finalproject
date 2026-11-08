import { request } from '../utils/request'

// who is logged in right now: { user, needsOnboarding }
// user is the person's own profile (with is_host), or null when nobody is logged in
const getSession = async () => {
  try {
    const user = await request('/api/users/me')
    return { user, needsOnboarding: false }
  } catch (error) {
    // not logged in; the server also says whether a GitHub user still has to finish onboarding
    if (error.status === 401) return { user: null, needsOnboarding: Boolean(error.body?.needsOnboarding) }
    throw error
  }
}

// log out through the existing login system
const logout = () => request('/auth/logout')

export default { getSession, logout }
