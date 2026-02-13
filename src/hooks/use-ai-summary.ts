'use client'

import { useState, useCallback, useRef } from 'react'

export function useAiSummary() {
  const [completion, setCompletion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const summarize = useCallback(async (title: string, content: string): Promise<string | null> => {
    setIsLoading(true)
    setError(null)
    setCompletion('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setCompletion(full)
      }

      setIsLoading(false)
      abortRef.current = null
      return full
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setIsLoading(false)
        abortRef.current = null
        return completion || null
      }
      setError((err as Error).message)
      setIsLoading(false)
      abortRef.current = null
      return null
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    setCompletion('')
    setError(null)
  }, [])

  return {
    summary: completion,
    isLoading,
    error,
    summarize,
    stop,
    reset,
  }
}
