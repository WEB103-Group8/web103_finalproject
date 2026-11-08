import { useState } from 'react'
import FormField from './FormField'
import '../css/Combobox.css'

// a text box with a dropdown under it: the parent decides what is typed and which options match, and the last choice is always "add a new one"
const Combobox = ({ id, label, error, placeholder, query, onQueryChange, options, emptyText, onPick, addLabel, addDisabled = false, onAdd, listLabel }) => {
  const [open, setOpen] = useState(false)

  return (
    // the dropdown stays open while focus is anywhere inside this box, and closes when focus leaves
    <div
      className="combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <FormField id={id} label={label} error={error}>
        <input
          id={id}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onQueryChange(event.target.value)
            setOpen(true)
          }}
          onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
        />
      </FormField>

      {open && (
        <ul aria-label={listLabel} className="combobox-list">
          {options.length === 0 && emptyText && <li className="combobox-none">{emptyText}</li>}
          {options.map((option) => (
            <li key={option.key}>
              <button
                type="button"
                onClick={() => {
                  onPick(option)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="combobox-add"
              disabled={addDisabled}
              onClick={() => {
                setOpen(false)
                onAdd()
              }}
            >
              {addLabel}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

export default Combobox
