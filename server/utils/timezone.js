import tzlookup from 'tz-lookup'

// the time zone of a place, such as "America/Chicago", worked out from its map position; nothing when the position cannot be used
const timezoneAt = (latitude, longitude) => {
    try {
        return tzlookup(latitude, longitude)
    } catch {
        return null
    }
}

// give an event (or map pin) the time zone of its venue, so its clock times can be shown with the right zone
const addTimezone = (row) => (typeof row.latitude === 'number' && typeof row.longitude === 'number' ? { ...row, timezone: timezoneAt(row.latitude, row.longitude) } : row)

const addTimezones = (rows) => rows.map(addTimezone)

export { addTimezone, addTimezones, timezoneAt }
