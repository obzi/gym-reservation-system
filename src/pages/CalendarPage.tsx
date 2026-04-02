import { useState } from 'react'
import { startOfWeek, format, addDays } from 'date-fns'
import { WeeklyGrid } from '../components/WeeklyGrid'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { useReservations } from '../hooks/useReservations'
import { useTheme } from '../hooks/useTheme'
import type { Profile } from '../types'
import { LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  profile: Profile
  userId: string
  onSignOut: () => void
}

export function CalendarPage({ profile, userId, onSignOut }: Props) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = addDays(weekStart, 6)

  const { reservations, createReservation, cancelReservation } = useReservations(
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd'),
  )

  return (
    <div className="min-h-screen bg-theme-bg">
      <header className="bg-theme-surface border-b border-theme-border px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-theme-text">Posilovna</h1>
          <div className="flex items-center gap-2">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <span className="text-sm text-theme-secondary hidden sm:inline ml-2">{profile.display_name}</span>
            {profile.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                <Settings size={15} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <button
              onClick={onSignOut}
              className="p-2 hover:bg-theme-hover rounded text-theme-secondary"
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
