import EventsAPI from '../services/EventsAPI'
import GroupsAPI from '../services/GroupsAPI'

// how many event titles and how many group names to suggest
const SUGGESTIONS_PER_KIND = 5

// names of events and groups that match what the person has typed so far, each name once
export const loadSearchSuggestions = async (text) => {
  const [events, groups] = await Promise.all([EventsAPI.getEvents({ q: text, limit: SUGGESTIONS_PER_KIND }), GroupsAPI.getGroups({ q: text })])

  const names = [...events.map((event) => event.event_title), ...groups.slice(0, SUGGESTIONS_PER_KIND).map((group) => group.group_name)]
  return [...new Set(names)]
}
