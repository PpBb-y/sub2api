/**
 * AI Chat input composer.
 * Text area with send/stop buttons.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SendIcon, StopIcon } from '@/components/icons'

interface AiComposerProps {
  onSend: (content: string) => void
  onStop: () => void
  isLoading: boolean
  disabled: boolean
}

export default function AiComposer({ onSend, onStop, isLoading, disabled }: AiComposerProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')

  function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading) {
        handleSubmit()
      }
    }
  }

  return (
    <div className="border-t border-border bg-background p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('admin.aiAnalyzer.placeholder')}
          disabled={disabled || isLoading}
          className="min-h-[44px] max-h-[160px] resize-none"
          rows={1}
        />
        {isLoading ? (
          <Button variant="destructive" size="icon" onClick={onStop} className="shrink-0">
            <StopIcon className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="shrink-0"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
