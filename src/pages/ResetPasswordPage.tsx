import { useState } from 'react'

interface Props {
  onUpdatePassword: (password: string) => Promise<{ error: { message: string } | null }>
}

export function ResetPasswordPage({ onUpdatePassword }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků')
      return
    }
    if (password !== confirm) {
      setError('Hesla se neshodují')
      return
    }

    setLoading(true)
    const { error } = await onUpdatePassword(password)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
        <div className="bg-theme-surface p-8 rounded-lg shadow-sm border border-theme-border w-full max-w-sm text-center">
          <h1 className="text-xl font-bold mb-4 text-theme-text">Heslo změněno</h1>
          <p className="text-theme-secondary mb-4">Vaše heslo bylo úspěšně změněno.</p>
          <a href="/gym-reservation-system/" className="text-blue-500 hover:underline">
            Pokračovat do aplikace
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
      <div className="bg-theme-surface p-8 rounded-lg shadow-sm border border-theme-border w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6 text-theme-text">Nové heslo</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Nové heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-theme-border rounded px-3 py-2 bg-theme-surface-alt text-theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Potvrzení hesla</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="w-full border border-theme-border rounded px-3 py-2 bg-theme-surface-alt text-theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-2 bg-red-100 border border-red-300 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Ukládám...' : 'Nastavit heslo'}
          </button>
        </form>
      </div>
    </div>
  )
}
