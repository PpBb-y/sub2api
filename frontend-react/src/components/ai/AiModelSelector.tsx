/**
 * Model selector for AI Analyzer.
 * Fetches available models from the gateway and presents a dropdown.
 */

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { fetchModels } from '@/api/aiChat'

interface AiModelSelectorProps {
  apiKey: string
  value: string
  onChange: (model: string) => void
}

export default function AiModelSelector({ apiKey, value, onChange }: AiModelSelectorProps) {
  const { t } = useTranslation()

  const { data: models, isLoading } = useQuery({
    queryKey: ['ai', 'models', apiKey],
    queryFn: () => fetchModels(apiKey),
    enabled: !!apiKey,
    staleTime: 120_000,
  })

  const modelList = models ?? []

  // Auto-select first model when list loads and no value set
  useEffect(() => {
    if (!value && modelList.length > 0) {
      const preferred = modelList.find((m) => m.includes('claude') || m.includes('gpt-4'))
      onChange(preferred ?? modelList[0])
    }
  }, [modelList.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t('admin.aiAnalyzer.modelLabel')}</Label>
      <Select value={value} onValueChange={onChange} disabled={!apiKey || isLoading}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue
            placeholder={
              isLoading
                ? t('admin.aiAnalyzer.loadingModels')
                : !apiKey
                  ? t('admin.aiAnalyzer.noApiKey')
                  : t('admin.aiAnalyzer.selectModel')
            }
          />
        </SelectTrigger>
        <SelectContent>
          {modelList.map((m) => (
            <SelectItem key={m} value={m} className="text-xs">
              {m}
            </SelectItem>
          ))}
          {modelList.length === 0 && !isLoading && (
            <SelectItem value="__none__" disabled className="text-xs">
              {t('admin.aiAnalyzer.noModels')}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
