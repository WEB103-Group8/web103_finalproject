// the allowed words and text lengths are written once, in the table definitions; this file reads them back so the code never repeats them

// every CHECK rule in the current schema, as text
const CHECKS_QUERY = `
    SELECT tables.relname AS table_name, pg_get_constraintdef(checks.oid) AS definition
    FROM pg_constraint checks
    JOIN pg_class tables ON tables.oid = checks.conrelid
    JOIN pg_namespace schemas ON schemas.oid = tables.relnamespace
    WHERE checks.contype = 'c' AND schemas.nspname = current_schema()`

// every column that has a length limit, like VARCHAR(100)
const LENGTHS_QUERY = `
    SELECT table_name, column_name, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND character_maximum_length IS NOT NULL`

// every whole-number column, with how many bits it uses (a 32-bit INTEGER column has 32)
const INTEGERS_QUERY = `
    SELECT table_name, column_name, numeric_precision
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND numeric_precision_radix = 2`

// pull the column name and its words out of rule text like: CHECK ((category = ANY (ARRAY['Arts'::text, 'Food'::text])))
const parseAllowedWords = (definition) => {
    const match = definition.match(/\(+(\w+)\)*(?:::text)? = ANY \(+ARRAY\[(.+?)\]/)
    if (!match) return null

    // each word sits between single quotes, and a quote inside a word is doubled
    const words = [...match[2].matchAll(/'((?:[^']|'')*)'/g)].map((word) => word[1].replace(/''/g, "'"))
    return { column: match[1], words }
}

// read the rules from the database: { allowedWords: { 'groups.category': [...] }, maxLengths: { 'venues.venue_name': 100 }, maxIntegers: { 'events.capacity': 2147483647 } }
const loadSchemaRules = async (pool) => {
    const [checks, lengths, integers] = await Promise.all([pool.query(CHECKS_QUERY), pool.query(LENGTHS_QUERY), pool.query(INTEGERS_QUERY)])

    // keep only the rules that list allowed words
    const allowedWords = {}
    for (const row of checks.rows) {
        const parsed = parseAllowedWords(row.definition)
        if (parsed) allowedWords[`${row.table_name}.${parsed.column}`] = parsed.words
    }

    const maxLengths = {}
    for (const row of lengths.rows) {
        maxLengths[`${row.table_name}.${row.column_name}`] = row.character_maximum_length
    }

    // the biggest value a signed column of that many bits holds, kept small enough for JavaScript to compare exactly
    const maxIntegers = {}
    for (const row of integers.rows) {
        maxIntegers[`${row.table_name}.${row.column_name}`] = Math.min(Number.MAX_SAFE_INTEGER, 2 ** (row.numeric_precision - 1) - 1)
    }

    return { allowedWords, maxLengths, maxIntegers }
}

// read the rules the first time they are needed, then reuse them; a failed read is tried again next time
const createRulesLoader = (pool) => {
    let loading = null

    return () => {
        if (!loading) {
            loading = loadSchemaRules(pool).catch((error) => {
                loading = null
                throw error
            })
        }
        return loading
    }
}

export { parseAllowedWords, loadSchemaRules, createRulesLoader }
