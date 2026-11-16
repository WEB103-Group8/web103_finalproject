// Fixed values shared by application rules and database constraints.
export const USER_TYPE = Object.freeze({
  HOST: 'host',
  ATTENDEE: 'attendee',
})

export const USER_TYPES = Object.freeze(Object.values(USER_TYPE))

export const RSVP_STATUS = Object.freeze({
  ATTENDING: 'attending',
  NOT_ATTENDING: 'not_attending',
})

export const RSVP_STATUSES = Object.freeze(Object.values(RSVP_STATUS))
