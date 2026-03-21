import api from './client'
import type { Race } from '../types'

export const racesApi = {
  getAll: (search?: string): Promise<Race[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    return api.get<Race[]>(`/races${params}`).then(r => r.data)
  },
  getOne: (index: string): Promise<Race> => api.get<Race>(`/races/${index}`).then(r => r.data),
}
