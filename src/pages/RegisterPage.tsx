import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'

interface Props {
  onSignUp: (email: string, password: string, displayName: string, token: string) => Promise<{ error: { message: string } | null }>
}

export function RegisterPage({ onSignUp }: Props) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold mb-4">Neplatný odkaz</h1>
          <p className="text-gray-600 mb-4">Pozvánka vypršela, kontaktuj správce</p>
          <Link to="/" className="text-blue-600 hover:underline">Přihlásit se</Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků')
      setLoading(false)
      return
    }

    const { error } = await onSignUp(email, password, displayName, token)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold mb-4">Registrace úspěšná!</h1>
          <p className="text-gray-600 mb-4">Zkontrolujte svůj email pro potvrzení účtu.</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">
            Přihlásit se
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Registrace</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jméno</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {loading ? 'Registruji...' : 'Zaregistrovat se'}
          </button>

          <div className="text-center text-sm">
            <Link to="/" className="text-blue-600 hover:underline">
              Už mám účet
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
