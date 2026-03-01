/**
 * API Key selector for AI Analyzer.
 * Shows user's active keys in a dropdown, with option for custom key input.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { keysAPI } from '@/api'
import type { ApiKey } from '@/types'

interface AiKeySelectorProps {
  value: string
  onChange: (key: string) => void
}

const CUSTOM_KEY_SENTINEL = '__custom__'

export default function AiKeySelector({ value, onChange }: AiKeySelectorProps) {
  const { t } = useTranslation()
  const [useCustom, setUseCustom] = useState(false)
  const [customKey, setCustomKey] = useState('')

  const { data: keysData } = useQuery({
    queryKey: ['user', 'keys', 'ai-selector'],
    queryFn: () => keysAPI.list(1, 100),
    staleTime: 60_000,
  })

  const activeKeys: ApiKey[] = (() => {
    const items = keysData?.data ?? []
    return items.filter((k) => k.status === 'active')
  })()

  // Auto-select first active key when keys load and no value is set
  useEffect(() => {
    if (!value && activeKeys.length > 0 && !useCustom) {
      onChange(activeKeys[0].key)
    }
  }, [activeKeys.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectChange(selectedValue: string) {
    if (selectedValue === CUSTOM_KEY_SENTINEL) {
      setUseCustom(true)
      onChange(customKey)
    } else {
      setUseCustom(false)
      onChange(selectedValue)
    }
  }

  function handleCustomKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newKey = e.target.value
    setCustomKey(newKey)
    onChange(newKey)
  }

  // Determine select display value
  const selectValue = (() => {
    if (useCustom) return CUSTOM_KEY_SENTINEL
    const match = activeKeys.find((k) => k.key === value)
    if (match) return match.key
    return undefined
  })()

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t('admin.aiAnalyzer.apiKeyLabel')}</Label>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={t('admin.aiAnalyzer.noApiKey')} />
        </SelectTrigger>
        <SelectContent>
          {activeKeys.map((k) => (
            <SelectItem key={k.id} value={k.key} className="text-xs">
              {k.name} ({k.key.slice(0, 8)}...{k.key.slice(-4)})
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_KEY_SENTINEL} className="text-xs">
            {t('admin.aiAnalyzer.customKey')}
          </SelectItem>
        </SelectContent>
      </Select>
      {useCustom && (
        <Input
          type="password"
          value={customKey}
          onChange={handleCustomKeyChange}
          placeholder={t('admin.aiAnalyzer.enterCustomKey')}
          className="h-8 text-xs"
        />
      )}
    </div>
  )
}
