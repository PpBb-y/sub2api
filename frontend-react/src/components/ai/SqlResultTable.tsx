/**
 * SQL Result Table component for AI Analyzer.
 * Renders query results in a scrollable table with copy SQL button.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CopyIcon, CheckIcon, DatabaseIcon } from '@/components/icons'

interface SqlResultTableProps {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number
  sql: string
}

export default function SqlResultTable({
  columns,
  rows,
  rowCount,
  durationMs,
  sql,
}: SqlResultTableProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  function handleCopySql() {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function formatValue(value: unknown): string {
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DatabaseIcon className="h-4 w-4" />
          <span>
            {rowCount} {t('admin.aiAnalyzer.rows')} &middot; {durationMs}ms
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopySql} className="h-7 gap-1 text-xs">
          {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
          {t('admin.aiAnalyzer.copySql')}
        </Button>
      </div>

      {/* SQL preview */}
      <div className="border-b border-border bg-muted/30 px-3 py-1.5">
        <code className="text-xs text-muted-foreground">{sql}</code>
      </div>

      {/* Table */}
      <div className="max-h-80 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="whitespace-nowrap text-xs font-medium">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col} className="whitespace-nowrap text-xs">
                    {formatValue(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-sm text-muted-foreground"
                >
                  No data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
