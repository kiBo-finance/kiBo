import { toast } from 'sonner'
import { useCallback } from 'react'

interface ErrorHandlerResult {
  handleError: (error: unknown, defaultMessage: string) => void
  handleApiError: (response: Response, defaultMessage: string) => Promise<void>
  handleApiResponse: <T>(
    response: Response,
    defaultMessage: string
  ) => Promise<{ success: true; data: T } | { success: false; error: string }>
  showSuccess: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
}

export function useErrorHandler(): ErrorHandlerResult {
  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const message = error instanceof Error ? error.message : defaultMessage
    toast.error(message)
    console.error('Error:', error)
  }, [])

  const handleApiError = useCallback(async (response: Response, defaultMessage: string) => {
    if (!response.ok) {
      try {
        const data = await response.json()
        throw new Error(data.error || defaultMessage)
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== defaultMessage) {
          throw parseError
        }
        throw new Error(defaultMessage)
      }
    }
  }, [])

  const handleApiResponse = useCallback(
    async <T>(
      response: Response,
      defaultMessage: string
    ): Promise<{ success: true; data: T } | { success: false; error: string }> => {
      try {
        const data = await response.json()

        if (!response.ok) {
          const errorMessage = data.error || defaultMessage
          toast.error(errorMessage)
          return { success: false, error: errorMessage }
        }

        // Handle both { success, data } and direct data response formats
        if (data.success !== undefined) {
          if (data.success) {
            return { success: true, data: data.data as T }
          } else {
            const errorMessage = data.error || defaultMessage
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
          }
        }

        return { success: true, data: data as T }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : defaultMessage
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      }
    },
    []
  )

  const showSuccess = useCallback((message: string) => {
    toast.success(message)
  }, [])

  const showWarning = useCallback((message: string) => {
    toast.warning(message)
  }, [])

  const showInfo = useCallback((message: string) => {
    toast.info(message)
  }, [])

  return {
    handleError,
    handleApiError,
    handleApiResponse,
    showSuccess,
    showWarning,
    showInfo,
  }
}
