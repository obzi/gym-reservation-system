import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useReservations } from '../hooks/useReservations'
import type { Profile } from '../types'
import type { GymSettings } from '../hooks/useSettings'
import { ArrowLeft, Copy, Check, Trash2, UserX, UserCheck, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, addDays } from 'date-fns'

interface AdminPageProps {
  settings: GymSettings
  onUpdateSettings: (updates: Partial<GymSettings>) => Promise<{ error: { message: string } | null }>
}

export function AdminPage({ settings, onUpdateSettings }: AdminPageProps) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'reservations' | 'users' | 'invites' | 'settings'>('reservations')

  const tabs = [
    { key: 'reservations' as const, label: 'Rezervace' },
    { key: 'users' as const, label: 'Uživatelé' },
    { key: 'invites' as const, label: 'Pozvánky' },
    { key: 'settings' as const, label: 'Nastavení' },
  ]

  return (
    <div className="min-h-screen bg-theme-bg">
      <header className="bg-theme-surface border-b border-theme-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-theme-hover rounded text-theme-text">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-theme-text">Administrace</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-theme-surface text-theme-secondary hover:bg-theme-hover border border-theme-border'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'reservations' && <AdminReservations />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'invites' && <AdminInvites />}
        {tab === 'settings' && <AdminSettings settings={settings} onUpdateSettings={onUpdateSettings} />}
      </main>
    </div>
  )
}

function AdminSettings({ settings, onUpdateSettings }: { settings: GymSettings; onUpdateSettings: (updates: Partial<GymSettings>) => Promise<{ error: { message: string } | null }> }) {
  const [form, setForm] = useState<GymSettings>({ ...settings })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = JSON.stringify(form) !== JSON.stringify(settings)

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const { error } = await onUpdateSettings(form)
    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const numberFields: { key: keyof GymSettings; label: string; min: number; max: number; step: number; suffix: string }[] = [
    { key: 'max_overlap', label: 'Max. osob na slot', min: 1, max: 20, step: 1, suffix: '' },
    { key: 'max_advance_days', label: 'Rezervace dopředu', min: 1, max: 30, step: 1, suffix: 'dní' },
    { key: 'slot_minutes', label: 'Délka slotu', min: 5, max: 60, step: 5, suffix: 'min' },
    { key: 'min_duration_minutes', label: 'Min. délka rezervace', min: 5, max: 120, step: 5, suffix: 'min' },
    { key: 'max_duration_minutes', label: 'Max. délka rezervace', min: 15, max: 480, step: 15, suffix: 'min' },
  ]

  const hours = Array.from({ length: 25 }, (_, i) => i)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

  return (
    <div className="bg-theme-surface rounded-lg border border-theme-border p-4">
      <h2 className="font-semibold mb-4 text-theme-text">Nastavení posilovny</h2>

      <div className="grid grid-cols-[1fr_auto] gap-y-4 gap-x-4 items-center">
        <label className="text-sm text-theme-text font-medium">Otevření</label>
        <div className="flex items-center gap-1">
          <select
            value={form.opening_hour}
            onChange={(e) => setForm((prev) => ({ ...prev, opening_hour: Number(e.target.value) }))}
            className="border border-theme-border rounded px-2 py-2 bg-theme-surface-alt text-theme-text"
          >
            {hours.filter(h => h < 24).map(h => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
            ))}
          </select>
          <span className="text-theme-text">:</span>
          <select
            value={form.opening_minute}
            onChange={(e) => setForm((prev) => ({ ...prev, opening_minute: Number(e.target.value) }))}
            className="border border-theme-border rounded px-2 py-2 bg-theme-surface-alt text-theme-text"
          >
            {minutes.map(m => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>

        <label className="text-sm text-theme-text font-medium">Zavření</label>
        <div className="flex items-center gap-1">
          <select
            value={form.closing_hour}
            onChange={(e) => setForm((prev) => ({ ...prev, closing_hour: Number(e.target.value) }))}
            className="border border-theme-border rounded px-2 py-2 bg-theme-surface-alt text-theme-text"
          >
            {hours.map(h => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
            ))}
          </select>
          <span className="text-theme-text">:</span>
          <select
            value={form.closing_minute}
            onChange={(e) => setForm((prev) => ({ ...prev, closing_minute: Number(e.target.value) }))}
            className="border border-theme-border rounded px-2 py-2 bg-theme-surface-alt text-theme-text"
          >
            {minutes.map(m => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>

        {numberFields.map((f) => (
          <React.Fragment key={f.key}>
            <label className="text-sm text-theme-text font-medium">{f.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
                min={f.min}
                max={f.max}
                step={f.step}
                className="w-20 border border-theme-border rounded px-3 py-2 bg-theme-surface-alt text-theme-text text-center"
              />
              {f.suffix && <span className="text-sm text-theme-secondary">{f.suffix}</span>}
            </div>
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mt-4 p-2 bg-red-100 border border-red-300 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Ukládám...' : 'Uložit'}
        </button>
        {saved && <span className="text-green-500 text-sm">Uloženo</span>}
      </div>
    </div>
  )
}

function AdminReservations() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const futureEnd = format(addDays(new Date(), 30), 'yyyy-MM-dd')
  const { reservations, adminCancelReservation } = useReservations(today, futureEnd)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const handleCancel = async (id: string) => {
    setCancelling(id)
    await adminCancelReservation(id)
    setCancelling(null)
  }

  return (
    <div className="bg-theme-surface rounded-lg border border-theme-border">
      <div className="p-4 border-b border-theme-border">
        <h2 className="font-semibold text-theme-text">Všechny rezervace</h2>
      </div>
      {reservations.length === 0 ? (
        <p className="p-4 text-theme-secondary text-sm">Žádné rezervace</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-theme-border">
              <th className="p-3 text-left text-theme-secondary font-medium">Jméno</th>
              <th className="p-3 text-left text-theme-secondary font-medium">Datum</th>
              <th className="p-3 text-left text-theme-secondary font-medium">Čas</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
          {reservations.map((r) => (
            <tr key={r.id}>
              <td className="p-3 font-medium text-theme-text">{r.profile?.display_name || 'Uživatel'}</td>
              <td className="p-3 text-theme-secondary">{r.date.split('-').reverse().join('.')}</td>
              <td className="p-3 text-theme-secondary">{r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}</td>
              <td className="p-3">
                <button
                  onClick={() => handleCancel(r.id)}
                  disabled={cancelling === r.id}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded disabled:opacity-50"
                  title="Zrušit rezervaci"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('display_name')
    if (data) setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const toggleActive = async (user: Profile) => {
    await supabase.from('profiles').update({ active: !user.active }).eq('id', user.id)
    fetchUsers()
  }

  const deleteUser = async (user: Profile) => {
    if (!confirm(`Opravdu smazat uživatele ${user.display_name}?`)) return
    await supabase.rpc('admin_delete_user', { p_user_id: user.id })
    fetchUsers()
  }

  if (loading) return <p className="text-theme-secondary">Načítám...</p>

  return (
    <div className="bg-theme-surface rounded-lg border border-theme-border">
      <div className="p-4 border-b border-theme-border">
        <h2 className="font-semibold text-theme-text">Uživatelé</h2>
      </div>
      <div className="divide-y divide-theme-border">
        {users.map((user) => (
          <div key={user.id} className="p-4 flex items-center justify-between">
            <div>
              <span className={`font-medium ${!user.active ? 'text-theme-secondary line-through' : 'text-theme-text'}`}>
                {user.display_name}
              </span>
              <span className="text-theme-secondary text-sm ml-2">{user.email}</span>
              {user.role === 'admin' && (
                <span className="ml-2 text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">admin</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleActive(user)}
                className={`p-2 rounded ${user.active ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-green-500 hover:bg-green-500/10'}`}
                title={user.active ? 'Deaktivovat' : 'Aktivovat'}
              >
                {user.active ? <UserX size={16} /> : <UserCheck size={16} />}
              </button>
              <button
                onClick={() => deleteUser(user)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                title="Smazat"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminInvites() {
  const [expiry, setExpiry] = useState<'24h' | '48h' | '7d'>('24h')
  const [generating, setGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [activeTokens, setActiveTokens] = useState<{ token: string; expires_at: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActiveTokens = useCallback(async () => {
    const { data } = await supabase
      .from('invite_tokens')
      .select('token, expires_at, created_at')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
    if (data) setActiveTokens(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchActiveTokens() }, [fetchActiveTokens])

  const generateInvite = async () => {
    setGenerating(true)
    const hours = expiry === '24h' ? 24 : expiry === '48h' ? 48 : 168
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('invite_tokens')
      .insert({ expires_at: expiresAt })

    if (!error) {
      await fetchActiveTokens()
    }
    setGenerating(false)
  }

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/gym-reservation-system/register?token=${token}`
    await navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const deleteToken = async (token: string) => {
    await supabase.from('invite_tokens').delete().eq('token', token)
    await fetchActiveTokens()
  }

  const formatExpiry = (expiresAt: string) => {
    const expires = new Date(expiresAt)
    const now = new Date()
    const diffMs = expires.getTime() - now.getTime()
    const diffH = Math.floor(diffMs / (1000 * 60 * 60))
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (diffH >= 24) {
      const days = Math.floor(diffH / 24)
      return `${days}d ${diffH % 24}h`
    }
    return `${diffH}h ${diffM}m`
  }

  return (
    <div className="bg-theme-surface rounded-lg border border-theme-border p-4">
      <h2 className="font-semibold mb-4 text-theme-text">Vygenerovat pozvánku</h2>

      <div className="flex gap-3 items-end mb-4">
        <div>
          <label className="block text-sm text-theme-secondary mb-1">Platnost</label>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value as '24h' | '48h' | '7d')}
            className="border border-theme-border rounded px-3 py-2 bg-theme-surface text-theme-text"
          >
            <option value="24h">24 hodin</option>
            <option value="48h">48 hodin</option>
            <option value="7d">7 dní</option>
          </select>
        </div>
        <button
          onClick={generateInvite}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generuji...' : 'Vygenerovat'}
        </button>
      </div>

      {loading ? (
        <p className="text-theme-secondary text-sm">Načítám...</p>
      ) : activeTokens.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-theme-secondary">Aktivní pozvánky</h3>
          {activeTokens.map((t) => (
            <div key={t.token} className="flex items-center gap-2 p-3 bg-theme-surface-alt rounded border border-theme-border">
              <input
                readOnly
                value={`${window.location.origin}/gym-reservation-system/register?token=${t.token}`}
                className="flex-1 bg-transparent text-sm font-mono outline-none text-theme-text"
              />
              <span className="text-xs text-theme-secondary whitespace-nowrap" title={`Vyprší: ${format(new Date(t.expires_at), 'd.M. HH:mm')}`}>
                {formatExpiry(t.expires_at)}
              </span>
              <button onClick={() => copyLink(t.token)} className="p-2 hover:bg-theme-hover rounded" title="Kopírovat">
                {copiedToken === t.token ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-theme-secondary" />}
              </button>
              <button onClick={() => deleteToken(t.token)} className="p-2 hover:bg-red-500/10 rounded" title="Smazat pozvánku">
                <Trash2 size={16} className="text-red-500" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-theme-secondary text-sm">Žádné aktivní pozvánky</p>
      )}
    </div>
  )
}
