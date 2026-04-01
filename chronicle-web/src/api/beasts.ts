import api from './client'
import type { Beast } from '../types'

export interface WildShapeActionRequest {
  action: 'enter' | 'revert' | 'damage' | 'heal' | 'restoreUses'
  beastName?: string
  beastMaxHp?: number
  beastCurrentHp?: number
  amount?: number
}

export const beastsApi = {
  getBeasts: (maxCr?: number, allowFly = true, allowSwim = true) => {
    const params: Record<string, string> = {}
    if (maxCr !== undefined) params.maxCr = String(maxCr)
    params.allowFly = String(allowFly)
    params.allowSwim = String(allowSwim)
    return api.get<Beast[]>('/beasts', { params }).then((r) => r.data)
  },

  updateWildShape: (characterId: string, req: WildShapeActionRequest) =>
    api.patch(`/characters/${characterId}/wildshape`, req).then((r) => r.data),
}
