// TEMPORARY test login page, used only by the dev page (orbit.html); delete it together with the dev page
import { useState } from 'react'
import { request } from './utils/request'
import { useLoad } from './utils/useLoad'

// pick a seeded person to log in as; needs the server started with DEV_LOGIN=true
const DevLogin = () => {
  const { data: people, error, loading } = useLoad(() => request('/api/dev/users'))
  const [problem, setProblem] = useState(null)

  // log in as that person, then reload so every page sees the new session
  const loginAs = async (userId) => {
    try {
      await request('/api/dev/login', { method: 'POST', body: { user_id: userId } })
      window.location.assign('/orbit.html')
    } catch (failure) {
      setProblem(failure.message)
    }
  }

  const list = (title, users) => (
    <>
      <h2>{title}</h2>
      {users.map((person) => (
        <p key={person.user_id}>
          <button type="button" onClick={() => loginAs(person.user_id)}>
            Log in as {person.full_name}
          </button>
        </p>
      ))}
    </>
  )

  if (loading) return <p>Loading...</p>
  if (error) return <p role="alert">Test login is off. Start the server with DEV_LOGIN=true. ({error})</p>

  return (
    <section style={{ maxWidth: 480, margin: '0 auto', padding: 24, textAlign: 'left' }}>
      <h1>Test login</h1>
      <p>This page stands in for the real login while it is being joined in.</p>
      {problem && <p role="alert">{problem}</p>}
      {list('Hosts', people.hosts)}
      {list('Attendees', people.attendees)}
    </section>
  )
}

export default DevLogin
