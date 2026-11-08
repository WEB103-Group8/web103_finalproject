import { createContext, useContext } from 'react'

// where any page can show a small pop-up message, such as "Event created."
export const ToastContext = createContext({ notify: () => {} })

// get the function that shows a pop-up message: notify('Event created.')
export const useToast = () => useContext(ToastContext)
