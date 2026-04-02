import { useState } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  onSignIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>
  onResetPassword: (email: string) => Promise<{ error: { message: string } | null }>
}

export function LoginPage({ onSignIn, onResetPassword }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (resetMode) {
      const { error } = await onResetPassword(email)
      if (error) {
        setError(error.message)
      } else {
        setResetSent(true)
      }
    } else {
      const { error } = await onSignIn(email, password)
      if (error) {
        setError(error.message)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
      <div className="bg-theme-surface p-8 rounded-lg shadow-sm border border-theme-border w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6 text-theme-text">Rezervace posilovny</h1>

        {resetSent ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">Odkaz pro obnovu hesla byl odeslán na váš email.</p>
            <button
              onClick={() => { setResetMode(false); setResetSent(false) }}
              className="text-blue-500 hover:underline text-sm"
            >
              Zpět na přihlášení
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-theme-border rounded px-3 py-2 bg-theme-surface-alt text-theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!resetMode && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Heslo</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-theme-border rounded px-3 py-2 bg-theme-surface-alt text-theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

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
              {loading ? 'Načítám...' : resetMode ? 'Odeslat odkaz' : 'Přihlásit se'}
            </button>

            <div className="text-center text-sm">
              {resetMode ? (
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="text-blue-500 hover:underline"
                >
                  Zpět na přihlášení
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-blue-500 hover:underline"
                >
                  Zapomenuté heslo
                </button>
              )}
            </div>

            <div className="text-center text-sm text-theme-secondary">
              Nemáte účet? Požádejte správce o pozvánku.
              <br />
              <Link to="/register" className="text-blue-500 hover:underline">
                Mám pozvánku
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
