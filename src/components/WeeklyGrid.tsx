import { useMemo, useState } from 'react'
import { format, addDays, isSameDay } from 'date-fns'
import { cs } from 'date-fns/locale'
import { TIME_SLOTS, MAX_OVERLAP, timeToMinutes, CLOSING_HOUR, SLOT_MINUTES } from '../lib/constants'
import type { Reservation } from '../types'
import { ReservationModal } from './ReservationModal'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  reservations: Reservation[]
  currentUserId: string | undefined
  onCreateReservation: (date: string, startTime: string, endTime: string) => Promise<{ error: { message: string } | null }>
  onCancelReservation: (id: string) => Promise<{ error: { message: string } | null }>
  weekStart: Date
  onWeekChange: (date: Date) => void
}

// Last slot that can START a reservation (21:45 can't — reservation would end after 22:00 or be 0 min)
const LAST_BOOKABLE_MINUTES = (CLOSING_HOUR * 60) - SLOT_MINUTES

export function WeeklyGrid({ reservations, currentUserId, onCreateReservation, onCancelReservation, weekStart, onWeekChange }: Props) {
  const [modalData, setModalData] = useState<{ date: string; time: string } | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const getSlotReservations = (date: Date, time: string): Reservation[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const slotMinutes = timeToMinutes(time)
    return reservations.filter((r) => {
      if (r.date !== dateStr) return false
      const startMin = timeToMinutes(r.start_time)
      const endMin = timeToMinutes(r.end_time)
      return slotMinutes >= startMin && slotMinutes < endMin
    })
  }

  const getSlotColor = (count: number): string => {
    if (count === 0) return 'bg-theme-slot-empty hover:bg-theme-slot-empty-hover'
    if (count === 1) return 'bg-green-200/70 hover:bg-green-300/80 dark:bg-green-900/40 dark:hover:bg-green-800/50'
    if (count === 2) return 'bg-yellow-200/70 hover:bg-yellow-300/80 dark:bg-yellow-900/40 dark:hover:bg-yellow-800/50'
    return 'bg-red-300/80 dark:bg-red-900/50'
  }

  const isLastSlot = (time: string) => timeToMinutes(time) >= LAST_BOOKABLE_MINUTES

  const handleSlotClick = (date: Date, time: string) => {
    // Last slot (21:45) — can't start new reservation here
    if (isLastSlot(time)) {
      // But still allow cancelling own reservation
      const slotRes = getSlotReservations(date, time)
      const userReservation = slotRes.find((r) => r.user_id === currentUserId)
      if (userReservation) {
        setCancelConfirm(userReservation.id)
      }
      return
    }

    const slotReservations = getSlotReservations(date, time)

    const userReservation = slotReservations.find((r) => r.user_id === currentUserId)
    if (userReservation) {
      setCancelConfirm(userReservation.id)
      return
    }

    if (slotReservations.length >= MAX_OVERLAP) {
      setError('Tento slot je plný (maximum 3 osoby)')
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
      <div className="flex items-center justify-between mb-4">
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
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-theme-border p-2 bg-theme-surface-alt w-16 text-theme-secondary">Čas</th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className={`border border-theme-border p-2 text-theme-text ${isSameDay(day, today) ? 'bg-blue-100/50 dark:bg-blue-900/20' : 'bg-theme-surface-alt'}`}
                >
                  <div className="font-semibold">{format(day, 'EEEEEE', { locale: cs })}</div>
                  <div className="text-theme-secondary">{format(day, 'd.M.')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => (
              <tr key={time}>
                <td className="border border-theme-border p-1 text-center bg-theme-surface-alt text-theme-secondary font-mono">
                  {time}
                </td>
                {days.map((day) => {
                  const slotRes = getSlotReservations(day, time)
                  const isPast = new Date(format(day, 'yyyy-MM-dd') + 'T' + time) < today
                  const lastSlot = isLastSlot(time)
                  const canClick = !isPast && (!lastSlot || slotRes.some(r => r.user_id === currentUserId))
                  return (
                    <td
                      key={`${day.toISOString()}-${time}`}
                      className={`border border-theme-border p-0.5 ${getSlotColor(slotRes.length)} ${isPast ? 'opacity-40' : canClick ? 'cursor-pointer' : 'cursor-default'} transition-all duration-150 hover:shadow-inner hover:ring-1 hover:ring-blue-400/40`}
                      onClick={() => canClick && handleSlotClick(day, time)}
                      title={slotRes.map((r) => r.profile?.display_name || 'Uživatel').join(', ')}
                    >
                      <div className="min-h-[20px] flex flex-col gap-0.5">
                        {slotRes.map((r) => (
                          <span
                            key={r.id}
                            className={`block truncate px-0.5 rounded text-[10px] leading-tight ${r.user_id === currentUserId ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-theme-secondary'}`}
                          >
                            {r.profile?.display_name || 'Uživatel'}
                          </span>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
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
        getSlotColor={getSlotColor}
        isLastSlot={isLastSlot}
      />

      {/* Create reservation modal */}
      {modalData && (
        <ReservationModal
          date={modalData.date}
          startTime={modalData.time}
          maxEndTime={`${CLOSING_HOUR}:00`}
          existingReservations={reservations.filter((r) => r.date === modalData.date)}
          onConfirm={handleCreate}
          onClose={() => setModalData(null)}
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
  getSlotColor,
  isLastSlot,
}: {
  days: Date[]
  today: Date
  currentUserId: string | undefined
  onSlotClick: (date: Date, time: string) => void
  getSlotReservations: (date: Date, time: string) => Reservation[]
  getSlotColor: (count: number) => string
  isLastSlot: (time: string) => boolean
}) {
  const [dayIndex, setDayIndex] = useState(() => {
    const todayIdx = days.findIndex((d) => isSameDay(d, today))
    return todayIdx >= 0 ? todayIdx : 0
  })

  const day = days[dayIndex]
  if (!day) return null

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setDayIndex(Math.max(0, dayIndex - 1))}
          disabled={dayIndex === 0}
          className="p-2 rounded hover:bg-theme-hover text-theme-text disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-theme-text">{format(day, 'EEEE', { locale: cs })}</div>
          <div className="text-sm text-theme-secondary">{format(day, 'd. MMMM', { locale: cs })}</div>
        </div>
        <button
          onClick={() => setDayIndex(Math.min(6, dayIndex + 1))}
          disabled={dayIndex === 6}
          className="p-2 rounded hover:bg-theme-hover text-theme-text disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="space-y-0.5">
        {TIME_SLOTS.map((time) => {
          const slotRes = getSlotReservations(day, time)
          const isPast = new Date(format(day, 'yyyy-MM-dd') + 'T' + time) < today
          const lastSlot = isLastSlot(time)
          const canClick = !isPast && (!lastSlot || slotRes.some(r => r.user_id === currentUserId))
          return (
            <div
              key={time}
              className={`flex items-stretch border border-theme-border rounded ${isPast ? 'opacity-40' : canClick ? 'cursor-pointer' : 'cursor-default'} ${getSlotColor(slotRes.length)} transition-all duration-150 hover:ring-1 hover:ring-blue-400/40`}
              onClick={() => canClick && onSlotClick(day, time)}
            >
              <div className="w-14 flex-shrink-0 p-1.5 text-xs font-mono text-theme-secondary border-r border-theme-border flex items-center justify-center">
                {time}
              </div>
              <div className="flex-1 p-1.5 flex flex-wrap gap-1 min-h-[32px]">
                {slotRes.map((r) => (
                  <span
                    key={r.id}
                    className={`text-xs px-1.5 py-0.5 rounded ${r.user_id === currentUserId ? 'bg-blue-200 font-bold text-blue-800 dark:bg-blue-800 dark:text-blue-200' : 'bg-theme-surface-alt text-theme-secondary'}`}
                  >
                    {r.profile?.display_name || 'Uživatel'}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
