import { useMemo, useState, useCallback } from 'react'
import { format, addDays, isSameDay } from 'date-fns'
import { cs } from 'date-fns/locale'
import { generateTimeSlots, timeToMinutes } from '../lib/constants'
import type { Reservation } from '../types'
import type { GymSettings } from '../hooks/useSettings'
import { ReservationModal } from './ReservationModal'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSwipe } from '../hooks/useSwipe'

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getUserColor(userId: string): { bg: string; text: string } {
  const hue = hashCode(userId) % 360
  return {
    bg: `hsl(${hue}, 55%, 75%)`,
    text: `hsl(${hue}, 60%, 20%)`,
  }
}

function sortedByUserId(res: Reservation[]): Reservation[] {
  return [...res].sort((a, b) => a.user_id.localeCompare(b.user_id))
}

interface Props {
  reservations: Reservation[]
  currentUserId: string | undefined
  onCreateReservation: (date: string, startTime: string, endTime: string) => Promise<{ error: { message: string } | null }>
  onCancelReservation: (id: string) => Promise<{ error: { message: string } | null }>
  weekStart: Date
  onWeekChange: (date: Date) => void
  settings: GymSettings
}

export function WeeklyGrid({ reservations, currentUserId, onCreateReservation, onCancelReservation, weekStart, onWeekChange, settings }: Props) {
  const [modalData, setModalData] = useState<{ date: string; time: string } | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const closingTime = `${String(settings.closing_hour).padStart(2, '0')}:${String(settings.closing_minute).padStart(2, '0')}`

  const timeSlots = useMemo(
    () => generateTimeSlots(settings.opening_hour, settings.opening_minute, settings.closing_hour, settings.closing_minute, settings.slot_minutes),
    [settings.opening_hour, settings.opening_minute, settings.closing_hour, settings.closing_minute, settings.slot_minutes],
  )

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const getSlotReservations = (date: Date, time: string): Reservation[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const slotMinutes = timeToMinutes(time)
    return sortedByUserId(reservations.filter((r) => {
      if (r.date !== dateStr) return false
      const startMin = timeToMinutes(r.start_time)
      const endMin = timeToMinutes(r.end_time)
      return slotMinutes >= startMin && slotMinutes < endMin
    }))
  }

  const getSlotColor = (count: number): string => {
    if (count === 0) return 'bg-theme-slot-empty hover:bg-theme-slot-empty-hover'
    if (count === 1) return 'bg-theme-slot-1 hover:bg-theme-slot-1-hover'
    if (count === 2) return 'bg-theme-slot-2 hover:bg-theme-slot-2-hover'
    return 'bg-theme-slot-full'
  }

  const handleSlotClick = (date: Date, time: string) => {
    const slotReservations = getSlotReservations(date, time)

    const userReservation = slotReservations.find((r) => r.user_id === currentUserId)
    if (userReservation) {
      setCancelConfirm(userReservation.id)
      return
    }

    if (slotReservations.length >= settings.max_overlap) {
      setError(`Tento slot je plný (maximum ${settings.max_overlap} osob)`)
      setTimeout(() => setError(null), 3000)
      return
    }

    const now = new Date()
    const slotDate = new Date(format(date, 'yyyy-MM-dd') + 'T' + time)
    if (slotDate < now) return

    setModalData({ date: format(date, 'yyyy-MM-dd'), time })
  }

  const handleCreate = async (date: string, startTime: string, endTime: string) => {
    const result = await onCreateReservation(date, startTime, endTime)
    if (result.error) {
      setError(result.error.message)
      setTimeout(() => setError(null), 4000)
    }
    setModalData(null)
  }

  const handleCancel = async () => {
    if (!cancelConfirm) return
    const result = await onCancelReservation(cancelConfirm)
    if (result.error) {
      setError(result.error.message)
      setTimeout(() => setError(null), 3000)
    }
    setCancelConfirm(null)
  }

  const today = new Date()

  return (
    <div className="w-full">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4 sticky top-[53px] z-30 bg-theme-bg py-2 -mx-4 px-4">
        <button
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          className="p-2 rounded hover:bg-theme-hover text-theme-text"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-theme-text">
          {format(weekStart, 'd. MMMM', { locale: cs })} – {format(addDays(weekStart, 6), 'd. MMMM yyyy', { locale: cs })}
        </h2>
        <button
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          className="p-2 rounded hover:bg-theme-hover text-theme-text"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
          {error}
        </div>
      )}

      {/* Grid - Desktop */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-theme-border p-2 bg-theme-surface-alt w-16 text-theme-secondary sticky top-[97px] z-20">Čas</th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className={`border border-theme-border p-2 text-theme-text sticky top-[97px] z-20 ${isSameDay(day, today) ? 'bg-blue-50' : 'bg-theme-surface-alt'}`}
                >
                  <div className="font-semibold">{format(day, 'EEEEEE', { locale: cs })}</div>
                  <div className="text-theme-secondary">{format(day, 'd.M.')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => {
              return (
              <tr key={time}>
                <td className="border border-theme-border p-1 text-center font-mono bg-theme-surface-alt text-theme-secondary">
                  {time}
                </td>
                {days.map((day) => {
                  const slotRes = getSlotReservations(day, time)
                  const isPast = new Date(format(day, 'yyyy-MM-dd') + 'T' + time) < today
                  const canClick = !isPast
                  return (
                    <td
                      key={`${day.toISOString()}-${time}`}
                      className={`border border-theme-border p-0 ${getSlotColor(slotRes.length)} ${isPast ? 'opacity-40' : canClick ? 'cursor-pointer' : 'cursor-default'} transition-all duration-150 hover:shadow-inner hover:ring-1 hover:ring-blue-400/40`}
                      onClick={() => canClick && handleSlotClick(day, time)}
                      title={slotRes.map((r) => r.profile?.display_name || 'Uživatel').join(', ')}
                    >
                      <div className={`min-h-[32px] flex flex-col ${slotRes.length === 1 ? 'justify-center' : ''}`}>
                        {slotRes.map((r, idx) => {
                          const color = getUserColor(r.user_id)
                          return (
                          <div
                            key={r.id}
                            className={`flex-1 flex items-center truncate px-1 text-xs leading-tight ${r.user_id === currentUserId ? 'font-bold' : ''} ${idx > 0 ? 'border-t border-white/30' : ''}`}
                            style={{ backgroundColor: color.bg, color: color.text }}
                          >
                            {r.profile?.display_name || 'Uživatel'}
                          </div>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
              )
            })}
            <tr>
              <td className="border border-theme-border p-1 text-center bg-theme-surface-alt text-theme-secondary font-mono">
                {closingTime}
              </td>
              {days.map((day) => (
                <td key={`${day.toISOString()}-close`} className="border border-theme-border p-0 bg-theme-surface-alt">
                  <div className="min-h-[12px] flex items-center justify-center text-[9px] text-theme-secondary">
                    Zavřeno
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <MobileDayView
        days={days}
        today={today}
        currentUserId={currentUserId}
        onSlotClick={handleSlotClick}
        getSlotReservations={getSlotReservations}
        weekStart={weekStart}
        onWeekChange={onWeekChange}
        timeSlots={timeSlots}
        closingTime={closingTime}
      />

      {/* Create reservation modal */}
      {modalData && (
        <ReservationModal
          date={modalData.date}
          startTime={modalData.time}
          maxEndTime={closingTime}
          existingReservations={reservations.filter((r) => r.date === modalData.date)}
          onConfirm={handleCreate}
          onClose={() => setModalData(null)}
          settings={settings}
        />
      )}

      {/* Cancel confirmation */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-[var(--modal-bg)] flex items-center justify-center z-50 p-4">
          <div className="bg-theme-surface rounded-lg p-6 max-w-sm w-full border border-theme-border">
            <h3 className="text-lg font-semibold mb-3 text-theme-text">Zrušit rezervaci?</h3>
            <p className="text-theme-secondary mb-4">Opravdu chcete zrušit tuto rezervaci?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setCancelConfirm(null)} className="px-4 py-2 text-theme-secondary hover:bg-theme-hover rounded">
                Ne
              </button>
              <button onClick={handleCancel} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Ano, zrušit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MobileDayView({
  days,
  today,
  currentUserId,
  onSlotClick,
  getSlotReservations,
  weekStart,
  onWeekChange,
  timeSlots,
  closingTime,
}: {
  days: Date[]
  today: Date
  currentUserId: string | undefined
  onSlotClick: (date: Date, time: string) => void
  getSlotReservations: (date: Date, time: string) => Reservation[]
  weekStart: Date
  onWeekChange: (date: Date) => void
  timeSlots: string[]
  closingTime: string
}) {
  const [dayIndex, setDayIndex] = useState(() => {
    const todayIdx = days.findIndex((d) => isSameDay(d, today))
    return todayIdx >= 0 ? todayIdx : 0
  })

  const goNext = useCallback(() => {
    setDayIndex((i) => {
      if (i >= 6) {
        onWeekChange(addDays(weekStart, 7))
        return 0
      }
      return i + 1
    })
  }, [weekStart, onWeekChange])

  const goPrev = useCallback(() => {
    setDayIndex((i) => {
      if (i <= 0) {
        onWeekChange(addDays(weekStart, -7))
        return 6
      }
      return i - 1
    })
  }, [weekStart, onWeekChange])

  const swipe = useSwipe(goNext, goPrev)

  const day = days[dayIndex]
  if (!day) return null

  return (
    <div className="md:hidden" {...swipe}>
      <div className="flex items-center justify-between mb-3 sticky top-[97px] z-20 bg-theme-bg py-2 -mx-4 px-4">
        <button
          onClick={goPrev}
          className="p-2 rounded hover:bg-theme-hover text-theme-text"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-theme-text">{format(day, 'EEEE', { locale: cs })}</div>
          <div className="text-sm text-theme-secondary">{format(day, 'd. MMMM', { locale: cs })}</div>
        </div>
        <button
          onClick={goNext}
          className="p-2 rounded hover:bg-theme-hover text-theme-text"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="space-y-0.5">
        {timeSlots.map((time) => {
          const slotRes = getSlotReservations(day, time)
          const isPast = new Date(format(day, 'yyyy-MM-dd') + 'T' + time) < today
          const canClick = !isPast
          return (
            <div
              key={time}
              className={`flex items-stretch border border-theme-border rounded bg-theme-surface ${isPast ? 'opacity-40' : canClick ? 'cursor-pointer' : 'cursor-default'} transition-all duration-150 hover:ring-1 hover:ring-blue-400/40`}
              onClick={() => canClick && onSlotClick(day, time)}
            >
              <div className="w-14 flex-shrink-0 p-1.5 text-xs font-mono text-theme-secondary border-r border-theme-border flex items-center justify-center">
                {time}
              </div>
              <div className="flex-1 flex min-h-[32px]">
                {slotRes.map((r, idx) => {
                  const color = getUserColor(r.user_id)
                  return (
                  <div
                    key={r.id}
                    className={`w-1/3 flex items-center justify-center truncate text-xs px-1 ${r.user_id === currentUserId ? 'font-bold' : ''} ${idx > 0 ? 'border-l border-white/30' : ''}`}
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {r.profile?.display_name || 'Uživatel'}
                  </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        <div className="flex items-stretch border border-theme-border rounded bg-theme-surface-alt">
          <div className="w-14 flex-shrink-0 p-1.5 text-xs font-mono text-theme-secondary border-r border-theme-border flex items-center justify-center">
            {closingTime}
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[32px] text-xs text-theme-secondary">
            Zavřeno
          </div>
        </div>
      </div>
    </div>
  )
}
