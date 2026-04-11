import type { ClassResource } from '../types'

export function mergeClassResources(
  current: ClassResource[] | undefined,
  updated: ClassResource[],
): ClassResource[] {
  if (!current || current.length === 0) return updated

  const updatedByKey = new Map(updated.map(resource => [resource.resourceKey, resource]))
  const merged = current.map(resource => updatedByKey.get(resource.resourceKey) ?? resource)
  const currentKeys = new Set(current.map(resource => resource.resourceKey))
  const appended = updated.filter(resource => !currentKeys.has(resource.resourceKey))

  return [...merged, ...appended]
}
