// this runs before every test file
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// remove whatever a test drew on the page, so the next test starts clean
afterEach(() => {
  cleanup()
})
