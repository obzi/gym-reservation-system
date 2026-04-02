import { useState } from 'react'
import { startOfWeek, format, addDays } from 'date-fns'
import { WeeklyGrid } from '../components/WeeklyGrid'
import { useReservations } from '../hooks/useReservations'
import type { Profile } from '../types'
import { LogOut, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  profile: Profile
  userId: string
  onSignOut: () => void
}

export function CalendarPage({ profile, userId, onSignOut }: Props) {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = addDays(weekStart, 6)

  const { reservations, createReservation, cancelReservation } = useReservations(
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd'),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Posilovna</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">{profile.display_name}</span>
            {profile.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-gray-100 rounded text-gray-600"
                title="Admin panel"
              >
                <Shield size={18} />
              </button>
            )}
            <button
              onClick={onSignOut}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="Odhlásit se"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <WeeklyGrid
          reservations={reservations}
          currentUserId={userId}
          onCreateReservation={createReservation}
          onCancelReservation={cancelReservation}
          weekStart={weekStart}
          onWeekChange={setWeekStart}
        />
      </main>
    </div>
  )
}
