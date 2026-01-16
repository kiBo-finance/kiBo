import { useState, useCallback } from 'react'

interface AsyncOperationState<T> {
  loading: boolean
  error: Error | null
  data: T | null
}

interface AsyncOperationResult<T> extends AsyncOperationState<T> {
  execute: (operation: () => Promise<T>) => Promise<T | null>
  reset: () => void
  setLoading: (loading: boolean) => void
}

export function useAsyncOperation<T = unknown>(): AsyncOperationResult<T> {
  const [state, setState] = useState<AsyncOperationState<T>>({
    loading: false,
    error: null,
    data: null,
  })

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const result = await operation()
      setState({ loading: false, error: null, data: result })
      return result
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Unknown error occurred')
      setState((prev) => ({ ...prev, loading: false, error }))
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null })
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    setLoading,
  }
}

// 複数の非同期操作を管理するフック
interface MultiAsyncOperationResult {
  loading: Record<string, boolean>
  errors: Record<string, Error | null>
  isLoading: (key: string) => boolean
  getError: (key: string) => Error | null
  execute: <T>(key: string, operation: () => Promise<T>) => Promise<T | null>
  reset: (key?: string) => void
}

export function useMultiAsyncOperation(): MultiAsyncOperationResult {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, Error | null>>({})

  const isLoading = useCallback((key: string): boolean => {
    return loading[key] || false
  }, [loading])

  const getError = useCallback((key: string): Error | null => {
    return errors[key] || null
  }, [errors])

  const execute = useCallback(async <T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    setLoading((prev) => ({ ...prev, [key]: true }))
    setErrors((prev) => ({ ...prev, [key]: null }))

    try {
      const result = await operation()
      setLoading((prev) => ({ ...prev, [key]: false }))
      return result
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Unknown error occurred')
      setLoading((prev) => ({ ...prev, [key]: false }))
      setErrors((prev) => ({ ...prev, [key]: error }))
      throw error
    }
  }, [])

  const reset = useCallback((key?: string) => {
    if (key) {
      setLoading((prev) => ({ ...prev, [key]: false }))
      setErrors((prev) => ({ ...prev, [key]: null }))
    } else {
      setLoading({})
      setErrors({})
    }
  }, [])

  return {
    loading,
    errors,
    isLoading,
    getError,
    execute,
    reset,
  }
}
