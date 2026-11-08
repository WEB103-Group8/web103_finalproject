import { useCallback, useMemo, useRef, useState } from 'react'
import '../css/Toasts.css'
import { ToastContext } from './ToastContext'

// how long (in milliseconds) a pop-up message stays before it goes away by itself
const TOAST_MS = 4000

// shows pop-up messages in the corner of the screen; they stay across page changes, so a message can be shown right after leaving a form
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  // take one message away
  const dismiss = useCallback((id) => setToasts((all) => all.filter((toast) => toast.id !== id)), [])

  // show a message, and take it away after a few seconds
  const notify = useCallback(
    (message) => {
      const id = nextId.current++
      setToasts((all) => [...all, { id, message }])
      setTimeout(() => dismiss(id), TOAST_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span>{toast.message}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => dismiss(toast.id)}>
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
