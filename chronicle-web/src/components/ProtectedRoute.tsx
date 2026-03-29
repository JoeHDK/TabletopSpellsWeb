import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useChatConnection } from '../hooks/useChatConnection'
import { useNotificationHub } from '../hooks/useNotificationHub'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  useChatConnection()
  useNotificationHub()
  usePushNotifications()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
