import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface GymSettings {
  max_overlap: number
  max_advance_days: number
  opening_hour: number
  closing_hour: number
  slot_minutes: number
  min_duration_minutes: number
  max_duration_minutes: number
}

export const DEFAULT_SETTINGS: GymSettings = {
  max_overlap: 3,
  max_advance_days: 3,
  opening_hour: 7,
  closing_hour: 22,
  slot_minutes: 15,
  min_duration_minutes: 15,
  max_duration_minutes: 120,
}

export function useSettings() {
  const [settings, setSettings] = useState<GymSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('gym_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (data) {
      setSettings({
        max_overlap: data.max_overlap,
        max_advance_days: data.max_advance_days,
        opening_hour: data.opening_hour,
        closing_hour: data.closing_hour,
        slot_minutes: data.slot_minutes,
        min_duration_minutes: data.min_duration_minutes,
        max_duration_minutes: data.max_duration_minutes,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateSettings = async (updates: Partial<GymSettings>) => {
    const { error } = await supabase
      .from('gym_settings')
      .update(updates)
      .eq('id', 1)
    if (!error) {
      setSettings((prev) => ({ ...prev, ...updates }))
    }
    return { error }
  }

  return { settings, loading, updateSettings, refetch: fetchSettings }
}
