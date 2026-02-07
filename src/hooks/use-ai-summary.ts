'use client'

import { useCompletion } from '@ai-sdk/react'

export function useAiSummary() {
  const { completion, isLoading, error, complete, stop, setCompletion } = useCompletion({
    api: '/api/summarize',
    streamProtocol: 'text',
    onFinish(prompt, completion) {
      console.log('[useAiSummary] Finished:', { completionLength: completion.length })
    },
    onError(error) {
      console.error('[useAiSummary] Error:', error)
    },
  })

  async function summarize(title: string, content: string): Promise<string | null> {
    const result = await complete('', {
      body: { title, content },
    })
    return result ?? null
  }

  function reset() {
    setCompletion('')
  }

  return {
    summary: completion,
    isLoading,
    error: error?.message ?? null,
    summarize,
    stop,
    reset,
  }
}
