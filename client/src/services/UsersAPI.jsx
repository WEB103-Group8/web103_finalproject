import { request, toQueryString } from '../utils/request'

// a public profile (email, country and ZIP only come back for the person themself)
const getUser = (userId) => request(`/api/users/${userId}`)

// the events a person organizes or attends; role can limit it to one of the two
const getUserEvents = (userId, role) => request(`/api/users/${userId}/events${toQueryString({ role })}`)

// the groups a person belongs to; each says whether the person organizes it
const getUserGroups = (userId) => request(`/api/users/${userId}/groups`)

// edit the logged-in person's own profile
const updateMe = (changes) => request('/api/users/me', { method: 'PATCH', body: changes })

export default { getUser, getUserEvents, getUserGroups, updateMe }
