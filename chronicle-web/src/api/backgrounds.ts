import api from './client'

export interface Background {
  index: string
  name: string
  skillProficiencies: string[]
  description: string
}

export const backgroundsApi = {
  getAll: (): Promise<Background[]> => api.get<Background[]>('/backgrounds').then(r => r.data),
  getOne: (index: string): Promise<Background> => api.get<Background>(`/backgrounds/${index}`).then(r => r.data),
}
