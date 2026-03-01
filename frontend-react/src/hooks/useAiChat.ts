/**
 * Custom AI Chat hook using OpenAI Responses API.
 * Manages chat messages, streaming, and tool execution.
 */

import { useState, useRef } from 'react'
import type OpenAI from 'openai'
import { createAiClient } from '@/api/aiChat'
import { SYSTEM_PROMPT } from '@/components/ai/AiSchemaPrompt'

// --- Types ---

export interface ToolDefinition {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

export interface ToolCallResult {
  toolCallId: string
  name: string
  args: Record<string, unknown>
  result?: unknown
  error?: string
  status: 'running' | 'done' | 'error'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCallResult[]
  createdAt: Date
}

export interface UseAiChatOptions {
  tools?: ToolDefinition[]
  systemPrompt?: string
}

export interface UseAiChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string, apiKey: string, model: string) => Promise<void>
  stop: () => void
  clear: () => void
}

let msgCounter = 0
function nextId(): string {
  return `msg_${Date.now()}_${++msgCounter}`
}

// --- Hook ---

export function useAiChat(options: UseAiChatOptions = {}): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const toolsRef = useRef(options.tools ?? [])
  toolsRef.current = options.tools ?? []

  function buildInputMessages(msgs: ChatMessage[]): OpenAI.Responses.ResponseInputItem[] {
    const items: OpenAI.Responses.ResponseInputItem[] = []
    for (const msg of msgs) {
      if (msg.role === 'user') {
        items.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'assistant') {
        if (msg.content) {
          items.push({ role: 'assistant', content: msg.content })
        }
        // Include tool calls and their results for context
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            items.push({
              type: 'function_call',
              id: tc.toolCallId,
              call_id: tc.toolCallId,
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            } as OpenAI.Responses.ResponseInputItem)
            if (tc.status === 'done' || tc.status === 'error') {
              items.push({
                type: 'function_call_output',
                call_id: tc.toolCallId,
                output: tc.error ?? JSON.stringify(tc.result),
              })
            }
          }
        }
      }
    }
    return items
  }

  function buildToolSchemas(): OpenAI.Responses.Tool[] {
    return toolsRef.current.map((t) => ({
      type: 'function' as const,
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))
  }

  async function sendMessage(content: string, apiKey: string, model: string): Promise<void> {
    if (!content.trim() || !apiKey || !model) return

    setError(null)
    setIsLoading(true)

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    }

    const assistantMsg: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      const client = createAiClient(apiKey)
      const allMessages = [...messages, userMsg]
      const inputMessages = buildInputMessages(allMessages)
      const tools = buildToolSchemas()

      await streamResponse(client, model, inputMessages, tools, assistantMsg.id, abortController)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — not an error
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMsg)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: m.content || errorMsg } : m,
          ),
        )
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }

  async function streamResponse(
    client: OpenAI,
    model: string,
    input: OpenAI.Responses.ResponseInputItem[],
    tools: OpenAI.Responses.Tool[],
    assistantMsgId: string,
    abortController: AbortController,
  ): Promise<void> {
    const stream = await client.responses.create(
      {
        model,
        input,
        instructions: options.systemPrompt ?? SYSTEM_PROMPT,
        stream: true,
        ...(tools.length > 0 ? { tools } : {}),
      },
      { signal: abortController.signal },
    )

    let textBuffer = ''
    const pendingToolCalls: Map<string, { name: string; args: string }> = new Map()

    for await (const event of stream) {
      if (abortController.signal.aborted) break

      switch (event.type) {
        case 'response.output_text.delta': {
          textBuffer += event.delta
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: textBuffer } : m)),
          )
          break
        }

        case 'response.function_call_arguments.delta': {
          const itemId = (event as Record<string, unknown>).item_id as string
          const existing = pendingToolCalls.get(itemId)
          if (existing) {
            existing.args += event.delta
          }
          break
        }

        case 'response.output_item.added': {
          const item = (event as Record<string, unknown>).item as Record<string, unknown>
          if (item?.type === 'function_call') {
            pendingToolCalls.set(item.id as string, {
              name: (item.name as string) ?? '',
              args: '',
            })
          }
          break
        }

        case 'response.output_item.done': {
          const doneItem = (event as Record<string, unknown>).item as Record<string, unknown>
          if (doneItem?.type === 'function_call') {
            const callId = doneItem.id as string
            const callData = pendingToolCalls.get(callId)
            if (callData) {
              const toolName = (doneItem.name as string) || callData.name
              const toolArgs = (doneItem.arguments as string) || callData.args
              let parsedArgs: Record<string, unknown> = {}
              try {
                parsedArgs = JSON.parse(toolArgs) as Record<string, unknown>
              } catch {
                /* ignore parse errors */
              }

              // Add tool call in "running" state
              const toolCallResult: ToolCallResult = {
                toolCallId: callId,
                name: toolName,
                args: parsedArgs,
                status: 'running',
              }

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolCallResult] }
                    : m,
                ),
              )

              // Execute tool
              const toolDef = toolsRef.current.find((t) => t.name === toolName)
              if (toolDef) {
                try {
                  const result = await toolDef.execute(parsedArgs)
                  toolCallResult.result = result
                  toolCallResult.status = 'done'
                } catch (err: unknown) {
                  toolCallResult.error =
                    err instanceof Error ? err.message : 'Tool execution failed'
                  toolCallResult.status = 'error'
                }
              } else {
                toolCallResult.error = `Unknown tool: ${toolName}`
                toolCallResult.status = 'error'
              }

              // Update tool call status
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolCalls: m.toolCalls?.map((tc) =>
                          tc.toolCallId === callId ? { ...toolCallResult } : tc,
                        ),
                      }
                    : m,
                ),
              )
            }
          }
          break
        }

        case 'response.completed': {
          // After all tool calls are executed, send results back if there were tool calls
          const completedResponse = (event as Record<string, unknown>).response as Record<
            string,
            unknown
          >
          const output = completedResponse?.output as Array<Record<string, unknown>> | undefined
          const functionCalls = output?.filter((o) => o.type === 'function_call') ?? []

          if (functionCalls.length > 0) {
            // Build continuation input with tool results
            const continuationInput: OpenAI.Responses.ResponseInputItem[] = [...input]

            // Add assistant's text output
            if (textBuffer) {
              continuationInput.push({ role: 'assistant', content: textBuffer })
            }

            // Add each function call and its result
            for (const fc of functionCalls) {
              const callId = fc.id as string
              const toolCall = pendingToolCalls.get(callId)
              const toolResult = (() => {
                // Read latest tool call result from state
                let result: unknown = undefined
                let error: string | undefined
                setMessages((prev) => {
                  const assistantMessage = prev.find((m) => m.id === assistantMsgId)
                  const tc = assistantMessage?.toolCalls?.find((t) => t.toolCallId === callId)
                  if (tc) {
                    result = tc.result
                    error = tc.error
                  }
                  return prev
                })
                return error ?? JSON.stringify(result)
              })()

              continuationInput.push({
                type: 'function_call',
                id: callId,
                call_id: callId,
                name: (fc.name as string) || toolCall?.name || '',
                arguments: (fc.arguments as string) || toolCall?.args || '{}',
              } as OpenAI.Responses.ResponseInputItem)

              continuationInput.push({
                type: 'function_call_output',
                call_id: callId,
                output: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              })
            }

            // Continue the conversation with tool results
            textBuffer = '' // Reset for new response
            pendingToolCalls.clear()
            await streamResponse(
              client,
              model,
              continuationInput,
              tools,
              assistantMsgId,
              abortController,
            )
            return
          }
          break
        }
      }
    }
  }

  function stop(): void {
    abortRef.current?.abort()
  }

  function clear(): void {
    setMessages([])
    setError(null)
  }

  return { messages, isLoading, error, sendMessage, stop, clear }
}
