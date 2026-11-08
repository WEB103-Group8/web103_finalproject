// a relative search: keep the items whose text contains every word typed, in any order and any capital letters
export const filterByText = (items, query, getText = (item) => item) => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)

  return items.filter((item) => {
    const text = String(getText(item)).toLowerCase()
    return words.every((word) => text.includes(word))
  })
}
