// tell the visitor which fields need fixing (400)
const sendValidationError = (res, details) => res.status(400).json({ error: 'Please fix the highlighted fields.', details })

// tell the visitor the thing they asked for does not exist (404)
const sendNotFound = (res, what) => res.status(404).json({ error: `${what} not found.` })

// log the real problem for us, but only show the visitor a general message (500)
const sendServerError = (res, action, error) => {
    console.error(`Failed to ${action}:`, error.code || error.message)
    res.status(500).json({ error: `Unable to ${action}.` })
}

// Postgres reports "a value is out of range or not valid" with codes that start with 22
const isBadValueError = (error) => String(error.code ?? '').startsWith('22')

// a value the database refuses (too big, not a date) is the visitor's mistake (400); anything else is ours (500)
const sendDatabaseError = (res, action, error) => {
    if (isBadValueError(error)) {
        return sendValidationError(res, { body: 'One of the values is out of range or not valid.' })
    }
    sendServerError(res, action, error)
}

export { sendValidationError, sendNotFound, sendServerError, sendDatabaseError }
