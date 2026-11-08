// an error from the API, carrying the status code and the field messages the server sent
export class ApiError extends Error {
  constructor(status, message, details = {}, body = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.body = body
  }
}

// read a response as JSON, or nothing if it has no body or is not JSON
const readJson = async (response) => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// call the API: send and receive JSON, include the login cookie, and turn every failure into an ApiError
export const request = async (path, { method = 'GET', body } = {}) => {
  let response

  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // the request never reached the server (offline, server stopped)
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  // a delete has nothing to send back
  if (response.status === 204) return null

  const data = await readJson(response)

  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? 'Something went wrong. Please try again.', data?.details ?? {}, data)
  }

  return data
}

// turn { state: 'TX', q: '' } into "?state=TX", leaving out anything empty
export const toQueryString = (filters) => {
  const params = new URLSearchParams()

  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(name, value)
  }

  const text = params.toString()
  return text ? `?${text}` : ''
}
