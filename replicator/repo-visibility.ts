import { readFileSync } from 'fs'
import { join } from 'path'

export type RepoVisibilityEntry = {
  repo: string
  public: boolean
  checkedAt: string
}

export type VisibilityMap = Record<string, RepoVisibilityEntry>

export function isPublicSource(map: VisibilityMap, geneKey: string): boolean {
  const prefix = geneKey.split(':')[0]
  return map[prefix]?.public === true
}

export function visibilityPath(stateDir: string): string {
  return join(stateDir, 'repo-visibility.json')
}

export function loadVisibilityMap(stateDir: string): VisibilityMap {
  try {
    return JSON.parse(readFileSync(visibilityPath(stateDir), 'utf8')) as VisibilityMap
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw err
  }
}
