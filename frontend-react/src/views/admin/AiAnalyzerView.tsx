/**
 * Admin AI Analyzer view.
 * Chat-based data analysis using AI with SQL tool calling.
 * Layout: Left panel (chat) + optional right panel (latest tool result).
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PanelRightOpenIcon, PanelRightCloseIcon, TrashIcon } from '@/components/icons'
import { useAiChat } from '@/hooks/useAiChat'
import { createAdminTools } from '@/components/ai/AiToolDefinitions'
import AiMessageList from '@/components/ai/AiMessageList'
import AiComposer from '@/components/ai/AiComposer'
import AiKeySelector from '@/components/ai/AiKeySelector'
import AiModelSelector from '@/components/ai/AiModelSelector'
import AiToolRenderer from '@/components/ai/AiToolRenderer'
import type { ToolCallResult } from '@/hooks/useAiChat'
import { cn } from '@/lib/utils'

const adminTools = createAdminTools()

export default function AiAnalyzerView() {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [showPanel, setShowPanel] = useState(true)

  const { messages, isLoading, error, sendMessage, stop, clear } = useAiChat({
    tools: adminTools,
  })

  function handleSend(content: string) {
    if (!apiKey || !model) return
    sendMessage(content, apiKey, model)
  }

  // Collect all completed tool calls for the right panel
  const allToolCalls: ToolCallResult[] = (() => {
    const calls: ToolCallResult[] = []
    for (const msg of messages) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          if (tc.status === 'done' || tc.status === 'error') {
            calls.push(tc)
          }
        }
      }
    }
    return calls
  })()

  const hasToolResults = allToolCalls.length > 0

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col">
      {/* Top bar: Key + Model selectors + actions */}
      <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
        <div className="w-56">
          <AiKeySelector value={apiKey} onChange={setApiKey} />
        </div>
        <div className="w-56">
          <AiModelSelector apiKey={apiKey} value={model} onChange={setModel} />
        </div>
        <div className="flex items-end gap-1.5 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={messages.length === 0}
            className="h-8 gap-1 text-xs"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {t('admin.aiAnalyzer.clearChat')}
          </Button>
          {hasToolResults && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPanel(!showPanel)}
              className="h-8 gap-1 text-xs"
            >
              {showPanel ? (
                <PanelRightCloseIcon className="h-3.5 w-3.5" />
              ) : (
                <PanelRightOpenIcon className="h-3.5 w-3.5" />
              )}
              {showPanel ? t('admin.aiAnalyzer.hidePanel') : t('admin.aiAnalyzer.showPanel')}
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {t('admin.aiAnalyzer.errorPrefix')}: {error}
        </div>
      )}

      {/* Main content: Chat + Panel */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Chat */}
        <div
          className={cn(
            'flex min-w-0 flex-col',
            hasToolResults && showPanel ? 'w-1/2 border-r border-border' : 'w-full',
          )}
        >
          <AiMessageList messages={messages} isLoading={isLoading} />
          <AiComposer
            onSend={handleSend}
            onStop={stop}
            isLoading={isLoading}
            disabled={!apiKey || !model}
          />
        </div>

        {/* Right: Tool results panel */}
        {hasToolResults && showPanel && (
          <div className="flex w-1/2 flex-col overflow-auto p-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              {t('admin.aiAnalyzer.sqlResult')}
            </h3>
            <div className="space-y-4">
              {allToolCalls.map((tc) => (
                <AiToolRenderer key={tc.toolCallId} toolCall={tc} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
