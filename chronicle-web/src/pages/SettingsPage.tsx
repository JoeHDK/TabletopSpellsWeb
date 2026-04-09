import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 bg-green-900/40 border border-green-700 text-green-300 rounded-lg px-3 py-2 text-sm">
      {message}
    </div>
  )
}

function ErrorBanner({ errors }: { errors: string[] }) {
  return (
    <div className="mb-4 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
      {errors.map((e, i) => <p key={i}>{e}</p>)}
    </div>
  )
}

function handleApiError(err: unknown): string[] {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (Array.isArray(data)) return data as string[]
  if (typeof data === 'string' && data.length > 0) return [data]
  return ['Something went wrong. Please try again.']
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { username, email, hasEmail, setUsername, setEmail } = useAuthStore()

  // Change password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwErrors, setPwErrors] = useState<string[]>([])

  // Change / add email
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailErrors, setEmailErrors] = useState<string[]>([])

  // Change username
  const [newUsername, setNewUsername] = useState('')
  const [unLoading, setUnLoading] = useState(false)
  const [unSuccess, setUnSuccess] = useState(false)
  const [unErrors, setUnErrors] = useState<string[]>([])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErrors([])
    setPwSuccess(false)
    if (newPassword !== confirmPassword) { setPwErrors(['New passwords do not match.']); return }
    if (newPassword.length < 8) { setPwErrors(['New password must be at least 8 characters.']); return }
    setPwLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setPwSuccess(true)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      setPwErrors(handleApiError(err))
    } finally {
      setPwLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailErrors([])
    setEmailSuccess(false)
    setEmailLoading(true)
    try {
      const res = await authApi.changeEmail(newEmail, emailPassword)
      setEmail(res.email)
      setEmailSuccess(true)
      setNewEmail(''); setEmailPassword('')
    } catch (err) {
      setEmailErrors(handleApiError(err))
    } finally {
      setEmailLoading(false)
    }
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUnErrors([])
    setUnSuccess(false)
    setUnLoading(true)
    try {
      const res = await authApi.changeUsername(newUsername)
      setUsername(res.username)
      setUnSuccess(true)
      setNewUsername('')
    } catch (err) {
      setUnErrors(handleApiError(err))
    } finally {
      setUnLoading(false)
    }
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500'
  const btnClass = 'w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">←</button>
        <h1 className="flex-1 font-bold text-lg">Settings</h1>
      </header>

      <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-4">

        {/* Account info */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Account</p>
          <p className="text-sm text-gray-400">Username: <span className="text-white font-medium">{username}</span></p>
          {email
            ? <p className="text-sm text-gray-400 mt-1">Email: <span className="text-white font-medium">{email}</span></p>
            : <p className="text-sm text-yellow-400 mt-1">⚠️ No email on this account. Add one below.</p>
          }
        </div>

        {/* Change username */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h2 className="font-semibold text-white mb-1">Change Username</h2>
          <p className="text-xs text-gray-500 mb-4">Your username is your display name in campaigns and messages.</p>
          {unSuccess && <SuccessBanner message="Username updated successfully." />}
          {unErrors.length > 0 && <ErrorBanner errors={unErrors} />}
          <form onSubmit={handleUsernameSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">New username</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                required minLength={3} maxLength={50} className={inputClass}
                placeholder={username ?? ''} />
            </div>
            <button type="submit" disabled={unLoading} className={btnClass}>
              {unLoading ? 'Saving…' : 'Change Username'}
            </button>
          </form>
        </div>

        {/* Add / change email */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h2 className="font-semibold text-white mb-1">{hasEmail ? 'Change Email' : 'Add Email'}</h2>
          <p className="text-xs text-gray-500 mb-4">
            {hasEmail
              ? 'Update the email address used to sign in.'
              : 'Adding an email lets you sign in with email and recover your account.'}
          </p>
          {emailSuccess && <SuccessBanner message="Email updated successfully." />}
          {emailErrors.length > 0 && <ErrorBanner errors={emailErrors} />}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{hasEmail ? 'New email' : 'Email address'}</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current password (to confirm)</label>
              <input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)}
                required className={inputClass} />
            </div>
            <button type="submit" disabled={emailLoading} className={btnClass}>
              {emailLoading ? 'Saving…' : hasEmail ? 'Change Email' : 'Add Email'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h2 className="font-semibold text-white mb-4">Change Password</h2>
          {pwSuccess && <SuccessBanner message="Password changed successfully." />}
          {pwErrors.length > 0 && <ErrorBanner errors={pwErrors} />}
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">New password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                required minLength={8} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                required className={inputClass} />
            </div>
            <button type="submit" disabled={pwLoading} className={btnClass}>
              {pwLoading ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
