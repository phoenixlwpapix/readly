import { streamText } from 'ai'
import { geminiModel } from '@/lib/ai'

export async function POST(req: Request) {
  const { content, title } = (await req.json()) as {
    content: string
    title: string
  }

  if (!content) {
    return Response.json({ error: 'No content provided' }, { status: 400 })
  }

  // Strip HTML tags for cleaner AI input
  const cleanContent = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000) // Limit context length

  console.log('[Summarize API] Request received for:', title)
  console.log('[Summarize API] Content length:', cleanContent.length)

  const result = streamText({
    model: geminiModel,
    system:
      'You are a helpful article summarizer. Provide concise, informative summaries in bullet point format. Use 3-5 bullet points. Each bullet should capture a key insight or fact from the article. Write in clear, simple language.',
    prompt: `Summarize this article titled "${title}":\n\n${cleanContent}`,
    onError({ error }) {
      console.error('[Summarize API] Streaming error:', error)
    },
    onFinish({ text, finishReason }) {
      console.log('[Summarize API] Finished:', { finishReason, textLength: text.length })
    },
  })

  return result.toTextStreamResponse()
}
