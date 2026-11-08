// these tests check the helper every page uses to load data with loading, error and retry states
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLoad } from './useLoad'

describe('useLoad', () => {
  it('starts loading, then gives the data', async () => {
    const load = vi.fn().mockResolvedValue(['a', 'b'])
    const { result } = renderHook(() => useLoad(load))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual(['a', 'b'])
    expect(result.current.error).toBeNull()
  })

  it('gives the error message when loading fails', async () => {
    const load = vi.fn().mockRejectedValue(new Error('Could not reach the server.'))
    const { result } = renderHook(() => useLoad(load))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Could not reach the server.')
    expect(result.current.data).toBeNull()
  })

  it('loads again when reload is called', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('Failed.')).mockResolvedValueOnce('ok')
    const { result } = renderHook(() => useLoad(load))
    await waitFor(() => expect(result.current.error).toBe('Failed.'))

    act(() => result.current.reload())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('ok'))

    expect(result.current.error).toBeNull()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('loads again when the inputs change', async () => {
    const load = vi.fn((id) => Promise.resolve(`item ${id}`))
    const { result, rerender } = renderHook(({ id }) => useLoad(() => load(id), [id]), { initialProps: { id: 1 } })
    await waitFor(() => expect(result.current.data).toBe('item 1'))

    rerender({ id: 2 })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('item 2'))
  })
})
