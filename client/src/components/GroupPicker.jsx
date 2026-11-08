import { useState } from 'react'
import { filterByText } from '../utils/filterByText'
import Combobox from './Combobox'
import GroupQuickAdd from './GroupQuickAdd'

// choose the group an event belongs to: type to search the host's groups, or add a new one
const GroupPicker = ({ value, groups, categories, error, onChange, onGroupCreated }) => {
  const selected = groups.find((group) => String(group.group_id) === value)
  const [query, setQuery] = useState(selected?.group_name ?? '')
  const [adding, setAdding] = useState(false)

  // while the chosen group's own name is in the box, still offer every group
  const searchText = selected && query === selected.group_name ? '' : query
  const matches = filterByText(groups, searchText, (group) => group.group_name)

  // typing something else forgets the group that was chosen
  const handleTyping = (text) => {
    setQuery(text)
    if (value && text !== selected?.group_name) onChange('')
  }

  // a group was just added: offer it, choose it, and close the small form
  const handleCreated = (group) => {
    onGroupCreated(group)
    onChange(String(group.group_id))
    setQuery(group.group_name)
    setAdding(false)
  }

  return (
    <>
      <Combobox
        id="group_id"
        label="Group"
        error={error}
        placeholder="Search your groups"
        query={query}
        onQueryChange={handleTyping}
        options={matches.map((group) => ({ key: group.group_id, label: group.group_name }))}
        emptyText="No matching group."
        onPick={(option) => {
          onChange(String(option.key))
          setQuery(option.label)
        }}
        addLabel="+ Add New Group"
        onAdd={() => setAdding(true)}
        listLabel="Group results"
      />

      {adding && <GroupQuickAdd initialName={query.trim()} categories={categories} onCreated={handleCreated} onCancel={() => setAdding(false)} />}
    </>
  )
}

export default GroupPicker
