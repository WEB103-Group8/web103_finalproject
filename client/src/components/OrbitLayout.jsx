import { Outlet } from 'react-router-dom'
import SessionProvider from '../context/SessionProvider'
import ToastProvider from '../context/ToastProvider'
import OrbitHeader from './OrbitHeader'

// the frame around every Orbit page: pop-up messages, who is logged in, the header, then the page itself
const OrbitLayout = () => (
  <ToastProvider>
    <SessionProvider>
      <OrbitHeader />
      <main className="orbit-page">
        <Outlet />
      </main>
    </SessionProvider>
  </ToastProvider>
)

export default OrbitLayout
