/**
 * AI Chat message list component.
 * Renders user and assistant messages with markdown support and tool call results.
 */

import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@/hooks/useAiChat'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserIcon, SparklesIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import AiToolRenderer from './AiToolRenderer'

interface AiMessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export default function AiMessageList({ messages, isLoading }: AiMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <SparklesIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Ask a question about your data to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3 py-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <SparklesIcon className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={cn('max-w-[85%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            {message.content}
          </div>
        ) : (
          <>
            {message.content && (
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
                <MessageContent content={message.content} />
              </div>
            )}
            {message.toolCalls?.map((tc) => (
              <AiToolRenderer key={tc.toolCallId} toolCall={tc} />
            ))}
          </>
        )}
      </div>
      {isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

/**
 * Simple markdown-ish content renderer.
 * Handles code blocks, inline code, bold, and line breaks.
 */
function MessageContent({ content }: { content: string }) {
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const codeContent = part.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
          return (
            <pre key={i} className="my-2 overflow-x-auto rounded bg-background/80 p-2 text-xs">
              <code>{codeContent}</code>
            </pre>
          )
        }
        // Handle inline formatting
        return (
          <span key={i}>
            {part.split('\n').map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <InlineContent text={line} />
              </span>
            ))}
          </span>
        )
      })}
    </>
  )
}

function InlineContent({ text }: { text: string }) {
  // Handle bold (**text**), inline code (`code`), and plain text
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="rounded bg-background/80 px-1 py-0.5 text-xs">
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
