import { useEffect } from 'react'
import '../css/Overlays.css'

// a pop-up that asks "are you sure?" before something that cannot be undone
const ConfirmModal = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) => {
  // pressing Escape cancels
  useEffect(() => {
    if (!open) return undefined

    const handleKey = (event) => {
      if (event.key === 'Escape') onCancel()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="modal-backdrop">
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {message && <p>{message}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
