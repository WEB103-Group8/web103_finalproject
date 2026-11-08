// these tests check how the app talks to the API, using a pretend server (no network needed)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request, toQueryString } from './request'

// answer the next request with this response
const answerWith = (status, body) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
    }),
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('sends the login cookie and returns the JSON answer', async () => {
    answerWith(200, { event_id: 1 })

    expect(await request('/api/events/1')).toEqual({ event_id: 1 })
    expect(fetch).toHaveBeenCalledWith('/api/events/1', expect.objectContaining({ method: 'GET', credentials: 'include' }))
  })

  it('sends a body as JSON with the right header', async () => {
    answerWith(201, { group_id: 5 })

    await request('/api/groups', { method: 'POST', body: { group_name: 'Cooks' } })

    const [, options] = fetch.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(options.body)).toEqual({ group_name: 'Cooks' })
  })

  it('returns nothing when the server answers 204', async () => {
    answerWith(204)

    expect(await request('/api/groups/5', { method: 'DELETE' })).toBeNull()
  })

  it('turns an error answer into an ApiError with the status, message and field details', async () => {
    answerWith(400, { error: 'Please fix the highlighted fields.', details: { event_title: 'Title is required.' } })

    const failure = await request('/api/events', { method: 'POST', body: {} }).catch((error) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure.status).toBe(400)
    expect(failure.message).toBe('Please fix the highlighted fields.')
    expect(failure.details).toEqual({ event_title: 'Title is required.' })
  })

  it('uses a plain message when the error answer is not JSON', async () => {
    answerWith(502, '<html>Bad gateway</html>')

    const failure = await request('/api/events').catch((error) => error)

    expect(failure.status).toBe(502)
    expect(failure.message).toMatch(/something went wrong/i)
  })

  it('reports a server that cannot be reached as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const failure = await request('/api/events').catch((error) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure.status).toBe(0)
    expect(failure.message).toMatch(/could not reach the server/i)
  })
})

describe('toQueryString', () => {
  it('builds a query string and leaves out empty values', () => {
    expect(toQueryString({ state: 'TX', q: '', city: undefined, category: null, sort: 'newest' })).toBe('?state=TX&sort=newest')
  })

  it('gives nothing when there are no filters, and encodes special characters', () => {
    expect(toQueryString({})).toBe('')
    expect(toQueryString({ q: 'code & coffee' })).toBe('?q=code+%26+coffee')
  })
})
