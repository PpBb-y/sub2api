/**
 * AI Analyzer tool definitions for admin users.
 * Each tool has a name, description, JSON Schema parameters, and an execute function.
 */

import type { ToolDefinition } from '@/hooks/useAiChat'
import { executeAdminQuery } from '@/api/aiChat'
import { ADMIN_SCHEMA_PROMPT } from './AiSchemaPrompt'

export function createAdminTools(): ToolDefinition[] {
  return [
    {
      type: 'function',
      name: 'execute_sql',
      description: ADMIN_SCHEMA_PROMPT,
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
        const result = await executeAdminQuery(sql, 15000)
        return result
      },
    },
  ]
}
