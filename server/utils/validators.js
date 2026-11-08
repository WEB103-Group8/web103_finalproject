// the rules come from the database (see schemaRules.js): rules.allowedWords['groups.category'] and rules.maxLengths['venues.venue_name']

// ids in the address bar must be plain whole numbers
const ID_PATTERN = /^\d+$/
const isValidId = (value) => ID_PATTERN.test(String(value))

// a picture link must be a web address
const isHttpUrl = (value) => {
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

// check one text field: it must be text, not empty (unless optional), and no longer than its column allows
const checkText = (details, field, value, label, maxLength, { required = true } = {}) => {
    const text = typeof value === 'string' ? value.trim() : ''

    if (required && text.length === 0) {
        details[field] = `${label} is required.`
    } else if (maxLength && text.length > maxLength) {
        details[field] = `${label} must be at most ${maxLength} characters.`
    }
}

// check an address someone typed in; returns an object of problems (empty when it is fine)
const validateAddress = (address, rules) => {
    const details = {}
    checkText(details, 'address', address, 'Address', rules.maxLengths['venues.address'])
    return details
}

// check the two things a host types when adding a venue
const validateVenueInput = (body, rules) => {
    const details = validateAddress(body.address, rules)
    checkText(details, 'venue_name', body.venue_name, 'Venue name', rules.maxLengths['venues.venue_name'])
    return details
}

// the fields a group can have
const GROUP_FIELDS = ['group_name', 'category', 'description', 'group_image_url']

// check the fields of a group; with partial set, only the fields that were sent are checked
const validateGroupInput = (body, rules, { partial = false } = {}) => {
    const details = {}
    const sent = (field) => body[field] !== undefined

    // an edit that changes nothing is a mistake
    if (partial && !GROUP_FIELDS.some(sent)) {
        details.body = 'Send at least one field to change.'
        return details
    }

    if (!partial || sent('group_name')) {
        checkText(details, 'group_name', body.group_name, 'Group name', rules.maxLengths['groups.group_name'])
    }

    // the category must be one of the words the database allows
    if (!partial || sent('category')) {
        const categories = rules.allowedWords['groups.category'] ?? []
        if (!categories.includes(body.category)) {
            details.category = `Category must be one of: ${categories.join(', ')}.`
        }
    }

    // the description is optional, but when it is sent it must be text
    if (sent('description') && body.description !== null && typeof body.description !== 'string') {
        details.description = 'Description must be text.'
    }

    // the picture is optional, but when it is sent it must be a web address
    if (sent('group_image_url') && body.group_image_url !== null && body.group_image_url !== '') {
        if (typeof body.group_image_url !== 'string' || !isHttpUrl(body.group_image_url.trim())) {
            details.group_image_url = 'Image must be a web address starting with http:// or https://.'
        }
    }

    return details
}

// the fields an event can have
const EVENT_FIELDS = ['group_id', 'venue_id', 'event_title', 'description', 'date', 'time', 'duration_minutes', 'capacity', 'event_image_url']

// the shapes a date and a time must be typed in
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/

// true when the text is a real calendar date like 2026-11-14 (so 2026-02-31 is refused)
const isRealDate = (text) => {
    const match = DATE_PATTERN.exec(text)
    if (!match) return false

    const [year, month, day] = match.slice(1).map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

// true when the text is a real time of day like 18:30
const isRealTime = (text) => {
    const match = TIME_PATTERN.exec(text)
    return Boolean(match) && Number(match[1]) < 24 && Number(match[2]) < 60
}

// a whole number above zero, sent either as a number or as digits in text
const isPositiveInteger = (value) => {
    const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
    return Number.isSafeInteger(number) && number > 0
}

// check the fields of an event; with partial set, only the fields that were sent are checked
const validateEventInput = (body, rules, { partial = false } = {}) => {
    const details = {}
    const sent = (field) => body[field] !== undefined
    const needed = (field) => !partial || sent(field)

    // an edit that changes nothing is a mistake
    if (partial && !EVENT_FIELDS.some(sent)) {
        details.body = 'Send at least one field to change.'
        return details
    }

    if (needed('group_id') && !isValidId(body.group_id)) details.group_id = 'Choose a group.'
    if (needed('venue_id') && !isValidId(body.venue_id)) details.venue_id = 'Choose a venue.'

    if (needed('event_title')) checkText(details, 'event_title', body.event_title, 'Title', rules.maxLengths['events.event_title'])
    if (needed('description')) checkText(details, 'description', body.description, 'Description', rules.maxLengths['events.description'])

    if (needed('date') && !isRealDate(body.date)) details.date = 'Date must be a real date like 2026-11-14.'
    if (needed('time') && !isRealTime(body.time)) details.time = 'Time must be a real time like 18:30.'

    if (needed('duration_minutes') && !isPositiveInteger(body.duration_minutes)) {
        details.duration_minutes = 'Duration must be a whole number of minutes above 0.'
    }

    // the capacity must be above zero and fit the column that stores it
    if (needed('capacity')) {
        const largest = rules.maxIntegers?.['events.capacity']
        if (!isPositiveInteger(body.capacity) || (largest && Number(body.capacity) > largest)) {
            details.capacity = 'Capacity must be a whole number above 0' + (largest ? ` and at most ${largest}.` : '.')
        }
    }

    // the picture is optional, but when it is sent it must be a web address
    if (sent('event_image_url') && body.event_image_url !== null && body.event_image_url !== '') {
        if (typeof body.event_image_url !== 'string' || !isHttpUrl(body.event_image_url.trim())) {
            details.event_image_url = 'Image must be a web address starting with http:// or https://.'
        }
    }

    return details
}

// turn a date, a time and a length into the start and end times we save; nowMs says what "the future" means
// times are kept as the venue's local clock time with no timezone, so they are worked out as plain clock times
const buildSchedule = ({ date, time, duration_minutes: duration }, nowMs) => {
    const start = Date.parse(`${date}T${time}:00Z`)
    const end = start + Number(duration) * 60 * 1000

    try {
        return {
            start_time: new Date(start).toISOString().slice(0, 19),
            end_time: new Date(end).toISOString().slice(0, 19),
            startsInFuture: start > nowMs
        }
    } catch {
        // a duration so long that the end is not a real time
        return null
    }
}

// the only fields a person may change on their own profile
const PROFILE_FIELDS = ['full_name', 'city', 'state', 'country', 'zipcode', 'user_image_url']

// the shape a ZIP code must have: five digits, optionally followed by a dash and four more
const ZIPCODE_PATTERN = /^\d{5}(-\d{4})?$/

// check a profile edit; any field outside the list above is refused, so nobody can change their own role or email
const validateProfileInput = (body, rules) => {
    const details = {}
    const sent = (field) => body[field] !== undefined

    for (const field of Object.keys(body)) {
        if (!PROFILE_FIELDS.includes(field)) details[field] = 'This field cannot be changed.'
    }

    // an edit that changes nothing is a mistake
    if (Object.keys(details).length === 0 && !PROFILE_FIELDS.some(sent)) {
        details.body = 'Send at least one field to change.'
    }

    // the name and city may not be emptied
    if (sent('full_name')) checkText(details, 'full_name', body.full_name, 'Name', rules.maxLengths['users.full_name'])
    if (sent('city')) checkText(details, 'city', body.city, 'City', rules.maxLengths['users.city'])

    // these fields are optional: they may be left empty to clear them, and otherwise must be text
    for (const field of ['state', 'country']) {
        if (sent(field) && body[field] !== null) checkText(details, field, body[field], field === 'state' ? 'State' : 'Country', rules.maxLengths[`users.${field}`], { required: false })
    }

    if (sent('zipcode') && body.zipcode !== null && body.zipcode !== '') {
        if (typeof body.zipcode !== 'string' || !ZIPCODE_PATTERN.test(body.zipcode.trim())) {
            details.zipcode = 'ZIP code must be five digits, like 78701.'
        }
    }

    if (sent('user_image_url') && body.user_image_url !== null && body.user_image_url !== '') {
        if (typeof body.user_image_url !== 'string' || !isHttpUrl(body.user_image_url.trim())) {
            details.user_image_url = 'Image must be a web address starting with http:// or https://.'
        }
    }

    return details
}

export { GROUP_FIELDS, EVENT_FIELDS, PROFILE_FIELDS, isValidId, isHttpUrl, validateAddress, validateVenueInput, validateGroupInput, validateEventInput, validateProfileInput, buildSchedule }
