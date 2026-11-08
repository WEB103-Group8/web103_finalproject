import { Route } from 'react-router-dom'
import OrbitLayout from './components/OrbitLayout'
import RequireRole from './components/RequireRole'
import EventCreate from './pages/EventCreate'
import EventDetails from './pages/EventDetails'
import EventEdit from './pages/EventEdit'
import EventsExplorer from './pages/EventsExplorer'
import GroupCreate from './pages/GroupCreate'
import GroupDetails from './pages/GroupDetails'
import GroupEdit from './pages/GroupEdit'
import GroupsIndex from './pages/GroupsIndex'
import MyCollection from './pages/MyCollection'
import MyProfile from './pages/MyProfile'
import NotFound from './pages/NotFound'
import PublicProfile from './pages/PublicProfile'
import Welcome from './pages/Welcome'

// a page only hosts can open: visitors are sent to log in, attendees see a friendly message
const hostOnly = (page, message) => (
  <RequireRole role="host" blockedMessage={message}>
    {page}
  </RequireRole>
)

// every Orbit page, inside one layout; App.jsx places this inside its <Routes>
const OrbitRoutes = () => (
  <>
    <Route element={<OrbitLayout />}>
      <Route path="/" element={<Welcome />} />
      <Route path="/events" element={<EventsExplorer />} />
      <Route path="/events/new" element={hostOnly(<EventCreate />, 'Only hosts can create events.')} />
      <Route path="/events/:eventId" element={<EventDetails />} />
      <Route path="/events/:eventId/edit" element={hostOnly(<EventEdit />, 'Only hosts can edit events.')} />
      <Route path="/groups" element={<GroupsIndex />} />
      <Route path="/groups/new" element={hostOnly(<GroupCreate />, 'Only hosts can create groups.')} />
      <Route path="/groups/:groupId" element={<GroupDetails />} />
      <Route path="/groups/:groupId/edit" element={hostOnly(<GroupEdit />, 'Only hosts can edit groups.')} />
      <Route
        path="/profile"
        element={
          <RequireRole role="user">
            <MyProfile />
          </RequireRole>
        }
      />
      <Route
        path="/collection"
        element={
          <RequireRole role="user">
            <MyCollection />
          </RequireRole>
        }
      />
      <Route path="/users/:userId" element={<PublicProfile />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  </>
)

export default OrbitRoutes
