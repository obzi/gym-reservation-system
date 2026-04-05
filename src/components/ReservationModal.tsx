import { useState, useMemo } from 'react'
import { getDurationOptions, addMinutesToTime, timeToMinutes } from '../lib/constants'
import type { Reservation } from '../types'
import type { GymSettings } from '../hooks/useSettings'
import { X } from 'lucide-react'

interface Props {
  date: string
  startTime: string
  maxEndTime: string
  existingReservations: Reservation[]
  onConfirm: (date: string, startTime: string, endTime: string) => void
  onClose: () => void
  settings: GymSettings
}

export function ReservationModal({ date, startTime, maxEndTime, existingReservations, onConfirm, onClose, settings }: Props) {
  const [duration, setDuration] = useState(settings.min_duration_minutes)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endTime = addMinutesToTime(startTime, duration)
  const closingMinutes = settings.closing_hour * 60

  const durationOptions = useMemo(() => {
    return getDurationOptions(settings.min_duration_minutes, settings.max_duration_minutes, settings.slot_minutes).filter((d) => {
      const end = addMinutesToTime(startTime, d)
      return timeToMinutes(end) <= timeToMinutes(maxEndTime) && timeToMinutes(end) <= closingMinutes
    })
  }, [startTime, maxEndTime, closingMinutes, settings])

  const wouldExceedOverlap = useMemo(() => {
    const startMin = timeToMinutes(startTime)
    const endMin = timeToMinutes(endTime)

    for (let m = startMin; m < endMin; m += settings.slot_minutes) {
      const slotTime = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      const count = existingReservations.filter((r) => {
        const rStart = timeToMinutes(r.start_time)
        const rEnd = timeToMinutes(r.end_time)
        return timeToMinutes(slotTime) >= rStart && timeToMinutes(slotTime) < rEnd
      }).length
      if (count >= settings.max_overlap) return true
    }
    return false
  }, [startTime, endTime, existingReservations, settings])

  const handleConfirm = async () => {
    if (wouldExceedOverlap) {
      setError(`Některý z vybraných slotů je plný (max ${settings.max_overlap} osob)`)
      return
    }
    setSubmitting(true)
    await onConfirm(date, startTime, endTime)
    setSubmitting(false)
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}.${m}.${y}`
  }

  return (
    <div className="fixed inset-0 bg-[var(--modal-bg)] flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface rounded-lg p-6 max-w-sm w-full border border-theme-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-theme-text">Nová rezervace</h3>
          <button onClick={onClose} className="p-1 hover:bg-theme-hover rounded text-theme-secondary">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <span className="text-sm text-theme-secondary">Datum:</span>
            <span className="ml-2 font-medium text-theme-text">{formatDate(date)}</span>
          </div>
          <div>
            <span className="text-sm text-theme-secondary">Začátek:</span>
            <span className="ml-2 font-medium text-theme-text">{startTime}</span>
          </div>
          <div>
            <label className="text-sm text-theme-secondary block mb-1">Délka:</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full border border-theme-border rounded px-3 py-2 bg-theme-surface text-theme-text"
            >
              {durationOptions.map((d) => (
                <option key={d} value={d}>
                  {d >= 60 ? `${Math.floor(d / 60)}h ${d % 60 ? `${d % 60}min` : ''}` : `${d} min`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-sm text-theme-secondary">Konec:</span>
            <span className="ml-2 font-medium text-theme-text">{endTime}</span>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {wouldExceedOverlap && (
          <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded">
            Některý slot v tomto rozsahu je plný
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-theme-secondary hover:bg-theme-hover rounded">
            Zrušit
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || wouldExceedOverlap}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Ukládám...' : 'Potvrdit'}
          </button>
        </div>
      </div>
    </div>
  )
}
