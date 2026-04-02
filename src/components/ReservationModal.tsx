import { useState, useMemo } from 'react'
import { getDurationOptions, addMinutesToTime, timeToMinutes, MAX_OVERLAP, CLOSING_HOUR } from '../lib/constants'
import type { Reservation } from '../types'
import { X } from 'lucide-react'

interface Props {
  date: string
  startTime: string
  maxEndTime: string
  existingReservations: Reservation[]
  onConfirm: (date: string, startTime: string, endTime: string) => void
  onClose: () => void
}

export function ReservationModal({ date, startTime, maxEndTime, existingReservations, onConfirm, onClose }: Props) {
  const [duration, setDuration] = useState(15)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endTime = addMinutesToTime(startTime, duration)
  const closingMinutes = CLOSING_HOUR * 60

  const durationOptions = useMemo(() => {
    return getDurationOptions().filter((d) => {
      const end = addMinutesToTime(startTime, d)
      return timeToMinutes(end) <= timeToMinutes(maxEndTime) && timeToMinutes(end) <= closingMinutes
    })
  }, [startTime, maxEndTime, closingMinutes])

  const wouldExceedOverlap = useMemo(() => {
    const startMin = timeToMinutes(startTime)
    const endMin = timeToMinutes(endTime)

    for (let m = startMin; m < endMin; m += 15) {
      const slotTime = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      const count = existingReservations.filter((r) => {
        const rStart = timeToMinutes(r.start_time)
        const rEnd = timeToMinutes(r.end_time)
        return timeToMinutes(slotTime) >= rStart && timeToMinutes(slotTime) < rEnd
      }).length
      if (count >= MAX_OVERLAP) return true
    }
    return false
  }, [startTime, endTime, existingReservations])

  const handleConfirm = async () => {
    if (wouldExceedOverlap) {
      setError('Některý z vybraných slotů je plný (max 3 osoby)')
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Nová rezervace</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <span className="text-sm text-gray-500">Datum:</span>
            <span className="ml-2 font-medium">{formatDate(date)}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Začátek:</span>
            <span className="ml-2 font-medium">{startTime}</span>
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">Délka:</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {durationOptions.map((d) => (
                <option key={d} value={d}>
                  {d >= 60 ? `${Math.floor(d / 60)}h ${d % 60 ? `${d % 60}min` : ''}` : `${d} min`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-sm text-gray-500">Konec:</span>
            <span className="ml-2 font-medium">{endTime}</span>
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
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
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
