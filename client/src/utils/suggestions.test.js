// this test checks that suggestions mix event titles and group names without repeats
import { describe, expect, it, vi } from 'vitest'

// replace the services with ones the test controls
vi.mock('../services/EventsAPI', () => ({ default: { getEvents: vi.fn() } }))
vi.mock('../services/GroupsAPI', () => ({ default: { getGroups: vi.fn() } }))

const { default: EventsAPI } = await import('../services/EventsAPI')
const { default: GroupsAPI } = await import('../services/GroupsAPI')
const { loadSearchSuggestions } = await import('./suggestions')

describe('loadSearchSuggestions', () => {
  it('gives matching event titles and group names, each once', async () => {
    EventsAPI.getEvents.mockResolvedValue([{ event_title: 'Jazz Night' }, { event_title: 'Code & Coffee' }])
    GroupsAPI.getGroups.mockResolvedValue([{ group_name: 'Code & Coffee' }, { group_name: 'Jazz Club' }])

    expect(await loadSearchSuggestions('jaz')).toEqual(['Jazz Night', 'Code & Coffee', 'Jazz Club'])
    expect(EventsAPI.getEvents).toHaveBeenCalledWith({ q: 'jaz', limit: 5 })
    expect(GroupsAPI.getGroups).toHaveBeenCalledWith({ q: 'jaz' })
  })
})
