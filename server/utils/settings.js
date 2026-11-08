// the names of the settings that say what a role or an answer is called in the database
const SETTING = {
    hostUserType: 'HOST_USER_TYPE',
    attendingStatus: 'ATTENDING_RSVP_STATUS'
}

// read a setting from the environment; stops with a clear message if it is missing, so no value is typed in the code
const requireSetting = (name, env = process.env) => {
    const value = env[name]

    if (value === undefined || value === '') {
        throw new Error(`Missing setting: ${name}`)
    }

    return value
}

export { SETTING, requireSetting }
