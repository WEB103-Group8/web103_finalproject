// turns a typed address into a city, state, ZIP code and map coordinates using an address-lookup service (OpenStreetMap's Nominatim)
// the service's settings come from environment variables, so none of them are written in the code

// the environment variables the lookup needs
const SETTING_NAMES = {
    url: 'GEOCODER_URL',
    userAgent: 'GEOCODER_USER_AGENT',
    countryCode: 'GEOCODER_COUNTRY_CODE',
    timeoutMs: 'GEOCODER_TIMEOUT_MS',
    minGapMs: 'GEOCODER_MIN_GAP_MS'
}

// a place can be filed under any of these names, depending on its size
const CITY_FIELDS = ['city', 'town', 'village', 'hamlet']

// make an error that carries a code the controllers can react to
const failure = (code, message) => Object.assign(new Error(message), { code })

// read the settings from the environment; throws and names every missing or invalid one
const readGeocoderConfig = (env = process.env) => {
    const numbers = ['timeoutMs', 'minGapMs']
    const problems = Object.entries(SETTING_NAMES)
        .filter(([key, name]) => !env[name] || (numbers.includes(key) && !(Number(env[name]) > 0)))
        .map(([, name]) => name)

    if (problems.length > 0) {
        throw failure('GEOCODER_NOT_CONFIGURED', `Missing or invalid settings: ${problems.join(', ')}`)
    }

    return {
        url: env[SETTING_NAMES.url],
        userAgent: env[SETTING_NAMES.userAgent],
        countryCode: env[SETTING_NAMES.countryCode].toLowerCase(),
        timeoutMs: Number(env[SETTING_NAMES.timeoutMs]),
        minGapMs: Number(env[SETTING_NAMES.minGapMs])
    }
}

// read the first match and keep only what we need; throws if it is not a usable address in the right country
const parseResult = (results, countryCode) => {
    const place = results?.[0]
    const address = place?.address ?? {}

    // the city can be filed under several names, so take the first one that exists
    const city = CITY_FIELDS.map((field) => address[field]).find(Boolean)

    // the state arrives like US-TX (the country code, a dash, then the state), so keep what follows the dash
    const region = address['ISO3166-2-lvl4'] ?? ''
    const prefix = `${countryCode.toUpperCase()}-`
    const state = region.startsWith(prefix) ? region.slice(prefix.length) : null

    const latitude = Number(place?.lat)
    const longitude = Number(place?.lon)

    // an address without a city, state, ZIP or position cannot be placed on the map
    if (!place || address.country_code !== countryCode || !city || !state || !address.postcode || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw failure('ADDRESS_NOT_FOUND', 'Address not found')
    }

    return { city, state, postal_code: address.postcode, latitude, longitude }
}

// build an address lookup; the settings, network and clock can be swapped out so tests never need the internet
const createGeocoder = ({
    config,
    fetchFn = fetch,
    now = Date.now,
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
} = {}) => {
    let lastCallAt = 0
    let queue = Promise.resolve()

    const lookUp = async (address) => {
        // settings are read when the lookup is used, so the rest of the app works even if they are missing
        const settings = config ?? readGeocoderConfig()

        // wait if the last request was too recent for the service's rate rule
        const gap = lastCallAt + settings.minGapMs - now()
        if (gap > 0) await wait(gap)
        lastCallAt = now()

        // ask for one result in the right country, with the address broken into parts
        const url = new URL(settings.url)
        url.search = new URLSearchParams({ q: address, format: 'jsonv2', addressdetails: '1', countrycodes: settings.countryCode, limit: '1' })

        // cancel the request if it takes too long
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), settings.timeoutMs)

        let results
        try {
            const response = await fetchFn(url, {
                headers: { 'User-Agent': settings.userAgent, Accept: 'application/json' },
                signal: controller.signal
            })
            if (!response.ok) throw new Error(`The service answered ${response.status}`)
            results = await response.json()
        } catch {
            throw failure('GEOCODER_UNAVAILABLE', 'Address lookup is unavailable')
        } finally {
            clearTimeout(timer)
        }

        return parseResult(results, settings.countryCode)
    }

    // run lookups one after another, so the rate rule holds even when requests arrive together
    return (address) => {
        const result = queue.then(() => lookUp(address))
        queue = result.catch(() => {})
        return result
    }
}

export { SETTING_NAMES, readGeocoderConfig, parseResult, createGeocoder }
export default createGeocoder()
