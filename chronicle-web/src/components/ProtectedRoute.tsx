import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useChatConnection } from '../hooks/useChatConnection'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  useChatConnection()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
