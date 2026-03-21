import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export default function SettingsPage() {
  const navigate = useNavigate()
  const username = useAuthStore((s) => s.username)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setErrors(['New passwords do not match.'])
      return
    }
    if (newPassword.length < 8) {
      setErrors(['New password must be at least 8 characters.'])
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      if (Array.isArray(data)) {
        setErrors(data as string[])
      } else if (typeof data === 'string') {
        setErrors([data])
      } else {
        setErrors(['Failed to change password. Check your current password and try again.'])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          ←
        </button>
        <h1 className="flex-1 font-bold text-lg">Settings</h1>
      </header>

      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {/* Account info */}
        <div className="mb-6 bg-gray-900 rounded-lg p-4 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Signed in as</p>
          <p className="font-semibold text-white">{username}</p>
        </div>

        {/* Change password */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h2 className="font-semibold text-white mb-4">Change Password</h2>

          {success && (
            <div className="mb-4 bg-green-900/40 border border-green-700 text-green-300 rounded-lg px-3 py-2 text-sm">
              Password changed successfully.
            </div>
          )}

          {errors.length > 0 && (
            <div className="mb-4 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
