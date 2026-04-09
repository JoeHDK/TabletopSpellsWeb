import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export default function AddEmailGatePage() {
  const navigate = useNavigate()
  const { hasEmail, setEmail, logout } = useAuthStore()

  const [email, setEmailInput] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // If they already have an email (e.g. navigated here directly), send them away
  useEffect(() => {
    if (hasEmail) navigate('/characters', { replace: true })
  }, [hasEmail, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setLoading(true)
    try {
      const res = await authApi.changeEmail(email, password)
      setEmail(res.email)
      navigate('/characters', { replace: true })
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      if (Array.isArray(data)) setErrors(data as string[])
      else if (typeof data === 'string' && data.length > 0) setErrors([data])
      else setErrors(['Something went wrong. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await authApi.logout().catch(() => {})
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Add an email address</h1>
        <p className="text-gray-400 text-sm mb-6">
          An email address is now required for account security and password recovery.
          Please add one to continue.
        </p>

        {errors.length > 0 && (
          <div className="mb-4 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email address</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Current password (to confirm)</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Saving…' : 'Add Email & Continue'}
          </button>
        </form>

        <button
          onClick={handleLogout}
          className="mt-4 w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}
