// TEMPORARY page for trying the Orbit pages without the real login pages; delete it (and orbit.html and DevLogin.jsx) once they are joined in
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import DevLogin from './DevLogin'
import OrbitRoutes from './OrbitRoutes'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/login" element={<DevLogin />} />
        {OrbitRoutes()}
      </Routes>
    </HashRouter>
  </StrictMode>,
)
