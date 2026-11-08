import { filterByText } from '../utils/filterByText'
import Combobox from './Combobox'

// a category text box with a dropdown of matching categories; any other text becomes a brand-new category
const CategoryField = ({ id, value, categories, onChange, error }) => {
  const matches = filterByText(categories, value)
  const isKnown = categories.some((category) => category.toLowerCase() === value.trim().toLowerCase())

  return (
    <>
      <Combobox
        id={id}
        label="Category"
        error={error}
        placeholder="Search or type a new category"
        query={value}
        onQueryChange={onChange}
        options={matches.map((category) => ({ key: category, label: category }))}
        emptyText="No matching category."
        onPick={(option) => onChange(option.label)}
        addLabel="+ Add New Category"
        addDisabled={!value.trim()}
        onAdd={() => {}}
        listLabel="Category results"
      />
      {value.trim() && !isKnown && <p className="field-note">"{value.trim()}" is a new category and will be added.</p>}
    </>
  )
}

export default CategoryField
