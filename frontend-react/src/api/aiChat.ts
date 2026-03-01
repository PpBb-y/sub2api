/**
 * AI Chat API utilities
 * Provides OpenAI SDK client for AI Analyzer and SQL query execution via admin API.
 */

import OpenAI from 'openai'
import { apiClient } from './client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

/**
 * Create an OpenAI client configured for sub2api gateway.
 */
export function createAiClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: API_BASE_URL,
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}

/**
 * Fetch available models from the gateway.
 */
export async function fetchModels(apiKey: string): Promise<string[]> {
  const client = createAiClient(apiKey)
  const list = await client.models.list()
  const models: string[] = []
  for await (const model of list) {
    models.push(model.id)
  }
  return models.sort()
}

/**
 * Execute a readonly SQL query via the admin API.
 */
export async function executeAdminQuery(
  sql: string,
  timeoutMs?: number,
): Promise<{
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  duration_ms: number
}> {
  const { data } = await apiClient.post('/admin/query', {
    sql,
    timeout_ms: timeoutMs ?? 10000,
  })
  return data as {
    columns: string[]
    rows: Record<string, unknown>[]
    row_count: number
    duration_ms: number
  }
}

/**
 * Execute a readonly SQL query via the user API.
 */
export async function executeUserQuery(
  sql: string,
  timeoutMs?: number,
): Promise<{
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  duration_ms: number
}> {
  const { data } = await apiClient.post('/user/query', {
    sql,
    timeout_ms: timeoutMs ?? 10000,
  })
  return data as {
    columns: string[]
    rows: Record<string, unknown>[]
    row_count: number
    duration_ms: number
  }
}
