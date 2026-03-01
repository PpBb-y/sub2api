/**
 * AI Analyzer tool definitions for regular users.
 * Restricted to user-accessible tables only (usage_logs, api_keys, user_subscriptions).
 */

import type { ToolDefinition } from '@/hooks/useAiChat'
import { executeUserQuery } from '@/api/aiChat'
import { USER_SCHEMA_PROMPT } from './AiSchemaPrompt'

export function createUserTools(): ToolDefinition[] {
  return [
    {
      type: 'function',
      name: 'execute_sql',
      description: USER_SCHEMA_PROMPT,
      parameters: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'A SELECT-only SQL query to execute against the PostgreSQL database',
          },
        },
        required: ['sql'],
        additionalProperties: false,
      },
      execute: async (args) => {
        const sql = args.sql as string
        if (!sql) throw new Error('SQL query is required')
        const result = await executeUserQuery(sql, 15000)
        return result
      },
    },
  ]
}
