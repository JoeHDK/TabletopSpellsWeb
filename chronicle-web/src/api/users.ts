import api from './client'

export interface UserPreferences {
  overviewCardOrder: string[]
}

export const usersApi = {
  getPreferences: () =>
    api.get<UserPreferences>('/users/me/preferences').then((r) => r.data),

  updatePreferences: (prefs: Partial<UserPreferences>) =>
    api.put<UserPreferences>('/users/me/preferences', prefs).then((r) => r.data),
}
