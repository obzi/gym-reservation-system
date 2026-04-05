import { useState } from 'react'
import { startOfWeek, format, addDays } from 'date-fns'
import { WeeklyGrid } from '../components/WeeklyGrid'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { useReservations } from '../hooks/useReservations'
import { useTheme } from '../hooks/useTheme'
import type { Profile } from '../types'
import type { GymSettings } from '../hooks/useSettings'
import { LogOut, Settings, Pencil, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  profile: Profile
  userId: string
  onSignOut: () => void
  onUpdateName: (name: string) => Promise<{ error: { message: string } | null }>
  settings: GymSettings
}

export function CalendarPage({ profile, userId, onSignOut, onUpdateName, settings }: Props) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = addDays(weekStart, 6)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(profile.display_name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { reservations, createReservation, cancelReservation } = useReservations(
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd'),
  )

  const handleSaveName = async () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setNameError('Jméno nesmí být prázdné')
      return
    }
    setSaving(true)
    const { error } = await onUpdateName(trimmed)
    if (error) {
      setNameError(error.message)
      setSaving(false)
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <header className="bg-theme-surface border-b border-theme-border px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-theme-text">Posilovna</h1>
          <div className="flex items-center gap-2">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <button
              onClick={() => { setEditingName(true); setNewName(profile.display_name); setNameError(null) }}
              className="flex items-center gap-1 text-sm text-theme-secondary hover:text-theme-text transition-colors hidden sm:flex"
              title="Upravit jméno"
            >
              <span>{profile.display_name}</span>
              <Pencil size={12} />
            </button>
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
          settings={settings}
        />
      </main>

      {/* Edit name modal */}
      {editingName && (
        <div className="fixed inset-0 bg-[var(--modal-bg)] flex items-center justify-center z-50 p-4">
          <div className="bg-theme-surface rounded-lg p-6 max-w-sm w-full border border-theme-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-text">Změnit jméno</h3>
              <button onClick={() => setEditingName(false)} className="p-1 hover:bg-theme-hover rounded text-theme-secondary">
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNameError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              className="w-full border border-theme-border rounded px-3 py-2 bg-theme-surface-alt text-theme-text focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            {nameError && (
              <div className="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 text-sm rounded">
                {nameError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditingName(false)} className="px-4 py-2 text-theme-secondary hover:bg-theme-hover rounded">
                Zrušit
              </button>
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Ukládám...' : 'Uložit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
