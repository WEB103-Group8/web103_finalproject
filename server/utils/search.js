// make a word safe to use inside ILIKE, so % and _ are treated as plain characters
const escapeLike = (word) => word.replace(/[\\%_]/g, '\\$&')

// split what the visitor typed into words: every word must appear in at least one of the columns
const addSearchConditions = (search, columns, values, conditions) => {
    const words = String(search ?? '').trim().split(/\s+/).filter(Boolean)

    for (const word of words) {
        values.push(`%${escapeLike(word)}%`)
        const placeholder = `$${values.length}`
        conditions.push(`(${columns.map((column) => `${column} ILIKE ${placeholder}`).join(' OR ')})`)
    }
}

export { addSearchConditions, escapeLike }
