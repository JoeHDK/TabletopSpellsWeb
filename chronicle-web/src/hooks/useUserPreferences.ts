import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type UserPreferences } from '../api/users'

export function useUserPreferences() {
  const qc = useQueryClient()

  const { data: preferences } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: usersApi.getPreferences,
  })

  const { mutate: updatePreferences } = useMutation({
    mutationFn: (prefs: Partial<UserPreferences>) => usersApi.updatePreferences(prefs),
    onSuccess: (updated) => {
      qc.setQueryData(['userPreferences'], updated)
      qc.invalidateQueries({ queryKey: ['userPreferences'] })
    },
  })

  return { preferences, updatePreferences }
}
