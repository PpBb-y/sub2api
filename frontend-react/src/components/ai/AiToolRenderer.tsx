/**
 * Tool result renderer for AI Analyzer.
 * Maps tool names to appropriate UI components.
 */

import type { ToolCallResult } from '@/hooks/useAiChat'
import { Skeleton } from '@/components/ui/skeleton'
import SqlResultTable from './SqlResultTable'

interface AiToolRendererProps {
  toolCall: ToolCallResult
}

interface SqlResult {
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  duration_ms: number
}

export default function AiToolRenderer({ toolCall }: AiToolRendererProps) {
  if (toolCall.status === 'running') {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Running {toolCall.name}...</span>
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (toolCall.status === 'error') {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
        <p className="text-sm font-medium text-destructive">Tool error: {toolCall.name}</p>
        <p className="mt-1 text-xs text-destructive/80">{toolCall.error}</p>
      </div>
    )
  }

  // Render based on tool name
  switch (toolCall.name) {
    case 'execute_sql': {
      const result = toolCall.result as SqlResult | undefined
      if (!result?.columns) {
        return (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <pre className="text-xs text-muted-foreground">
              {JSON.stringify(toolCall.result, null, 2)}
            </pre>
          </div>
        )
      }
      return (
        <SqlResultTable
          columns={result.columns}
          rows={result.rows}
          rowCount={result.row_count}
          durationMs={result.duration_ms}
          sql={(toolCall.args.sql as string) ?? ''}
        />
      )
    }
    default:
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{toolCall.name}</p>
          <pre className="max-h-60 overflow-auto text-xs text-muted-foreground">
            {JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      )
  }
}
