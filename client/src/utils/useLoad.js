import { useEffect, useEffectEvent, useState } from 'react'

// load data for a page: gives { data, error, notFound, loading, reload }; it loads again whenever the inputs change;
// notFound is true when the server answered 404, so a page can show the 404 page
export const useLoad = (load, inputs = []) => {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: null, notFound: false })

  // one key for "this load": the inputs plus how many times the person pressed retry
  const key = JSON.stringify([inputs, attempt])

  // always call the newest load function without restarting the load every render
  const run = useEffectEvent(() => load())

  useEffect(() => {
    let active = true

    run()
      .then((data) => active && setResult({ key, data, error: null, notFound: false }))
      .catch((error) => active && setResult({ key, data: null, error: error.message, notFound: error.status === 404 }))

    return () => {
      active = false
    }
  }, [key])

  // still loading until the answer belongs to the current key
  const loading = result.key !== key

  return {
    data: loading ? null : result.data,
    error: loading ? null : result.error,
    notFound: loading ? false : result.notFound,
    loading,
    reload: () => setAttempt(attempt + 1),
  }
}
