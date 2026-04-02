import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useReservations } from '../hooks/useReservations'
import type { Profile } from '../types'
import { ArrowLeft, Copy, Check, Trash2, UserX, UserCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, addDays } from 'date-fns'

export function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'reservations' | 'users' | 'invites'>('reservations')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Administrace</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-6">
          {(['reservations', 'users', 'invites'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
            >
              {t === 'reservations' ? 'Rezervace' : t === 'users' ? 'Uživatelé' : 'Pozvánky'}
            </button>
          ))}
        </div>

        {tab === 'reservations' && <AdminReservations />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'invites' && <AdminInvites />}
      </main>
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
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold">Všechny rezervace</h2>
      </div>
      {reservations.length === 0 ? (
        <p className="p-4 text-gray-500 text-sm">Žádné rezervace</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {reservations.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <span className="font-medium">{r.profile?.display_name || 'Uživatel'}</span>
                <span className="text-gray-500 text-sm ml-3">
                  {r.date.split('-').reverse().join('.')} {r.start_time}–{r.end_time}
                </span>
              </div>
              <button
                onClick={() => handleCancel(r.id)}
                disabled={cancelling === r.id}
                className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                title="Zrušit rezervaci"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
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

  if (loading) return <p className="text-gray-500">Načítám...</p>

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold">Uživatelé</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {users.map((user) => (
          <div key={user.id} className="p-4 flex items-center justify-between">
            <div>
              <span className={`font-medium ${!user.active ? 'text-gray-400 line-through' : ''}`}>
                {user.display_name}
              </span>
              <span className="text-gray-500 text-sm ml-2">{user.email}</span>
              {user.role === 'admin' && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">admin</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleActive(user)}
                className={`p-2 rounded ${user.active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                title={user.active ? 'Deaktivovat' : 'Aktivovat'}
              >
                {user.active ? <UserX size={16} /> : <UserCheck size={16} />}
              </button>
              <button
                onClick={() => deleteUser(user)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
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
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const generateInvite = async () => {
    setGenerating(true)
    const hours = expiry === '24h' ? 24 : expiry === '48h' ? 48 : 168
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('invite_tokens')
      .insert({ expires_at: expiresAt })
      .select('token')
      .single()

    if (!error && data) {
      const link = `${window.location.origin}/gym-reservation-system/register?token=${data.token}`
      setGeneratedLink(link)
    }
    setGenerating(false)
  }

  const copyLink = async () => {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="font-semibold mb-4">Vygenerovat pozvánku</h2>

      <div className="flex gap-3 items-end mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Platnost</label>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value as '24h' | '48h' | '7d')}
            className="border border-gray-300 rounded px-3 py-2"
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

      {generatedLink && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
          <input
            readOnly
            value={generatedLink}
            className="flex-1 bg-transparent text-sm font-mono outline-none"
          />
          <button onClick={copyLink} className="p-2 hover:bg-gray-200 rounded" title="Kopírovat">
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
        </div>
      )}
    </div>
  )
}
