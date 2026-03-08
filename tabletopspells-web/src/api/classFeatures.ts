import api from './client'
import type { ClassFeature } from '../types'

export const classFeaturesApi = {
  getForCharacter: (className: string, level: number, subclass?: string): Promise<ClassFeature[]> => {
    const params = new URLSearchParams({ class: className, level: String(level) })
    if (subclass) params.append('subclass', subclass)
    return api.get<ClassFeature[]>(`/class-features?${params}`).then(r => r.data)
  },
}
