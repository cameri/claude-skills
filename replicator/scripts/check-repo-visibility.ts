#!/usr/bin/env bun
// Maintenance script, not part of the weekly publish path: builds
// docs/replicator/repo-visibility.json, the map buildPublishPlan uses to
// exclude any gene whose plugin isn't confirmed to live in a public repo.
// Re-run whenever a new plugin/marketplace is installed, or periodically to
// catch a repo that went private.
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { visibilityPath, type VisibilityMap } from '../repo-visibility'

const STATE_DIR = process.env.REPLICATOR_STATE_DIR ?? '/workspace/docs/replicator'
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR ?? `${process.env.HOME}/.claude`

type MarketplaceSource = { source: string; repo?: string; url?: string }
type Marketplace = { source: MarketplaceSource }

// Sources outside the plugin-marketplace system entirely — cloned
// standalone repos whose skills still show up as genes (e.g. printing-press,
// see projects/CLAUDE.md's directory listing). Add an entry here when a new
// one turns up; there's no way to auto-discover these.
const MANUAL_REPOS: Record<string, string> = {
  'printing-press': 'mvanhorn/cli-printing-press',
  'printing-press-amend': 'mvanhorn/cli-printing-press',
  'printing-press-import': 'mvanhorn/cli-printing-press',
  'printing-press-output-review': 'mvanhorn/cli-printing-press',
  'printing-press-polish': 'mvanhorn/cli-printing-press',
  'printing-press-publish': 'mvanhorn/cli-printing-press',
  'printing-press-reprint': 'mvanhorn/cli-printing-press',
  'printing-press-retro': 'mvanhorn/cli-printing-press',
  'printing-press-score': 'mvanhorn/cli-printing-press',
}

function parseOwnerRepo(source: MarketplaceSource): string | null {
  if (source.repo) return source.repo
  const match = source.url?.match(/github\.com[:/]([^/]+\/[^/.]+)(\.git)?$/)
  return match ? match[1] : null
}

async function checkVisibility(ownerRepo: string): Promise<boolean> {
  const proc = Bun.spawnSync(['gh', 'repo', 'view', ownerRepo, '--json', 'isPrivate'])
  if (proc.exitCode !== 0) {
    throw new Error(`gh repo view ${ownerRepo} failed: ${proc.stderr.toString()}`)
  }
  const { isPrivate } = JSON.parse(proc.stdout.toString()) as { isPrivate: boolean }
  return !isPrivate
}

async function main(): Promise<void> {
  const marketplaces = JSON.parse(readFileSync(join(CLAUDE_DIR, 'plugins', 'known_marketplaces.json'), 'utf8')) as Record<string, Marketplace>
  const installed = JSON.parse(readFileSync(join(CLAUDE_DIR, 'plugins', 'installed_plugins.json'), 'utf8')) as {
    plugins: Record<string, unknown>
  }

  // pluginName -> ownerRepo, deduplicating repeated lookups per unique repo
  const pluginRepo: Record<string, string> = {}
  for (const pluginAtMarketplace of Object.keys(installed.plugins)) {
    const [pluginName, marketplaceName] = pluginAtMarketplace.split('@')
    const marketplace = marketplaces[marketplaceName]
    const ownerRepo = marketplace ? parseOwnerRepo(marketplace.source) : null
    if (ownerRepo) pluginRepo[pluginName] = ownerRepo
  }
  for (const [pluginName, ownerRepo] of Object.entries(MANUAL_REPOS)) {
    pluginRepo[pluginName] = ownerRepo
  }

  const uniqueRepos = [...new Set(Object.values(pluginRepo))]
  const visibilityByRepo = new Map<string, boolean>()
  for (const repo of uniqueRepos) {
    visibilityByRepo.set(repo, await checkVisibility(repo))
    console.log(`${repo}: ${visibilityByRepo.get(repo) ? 'public' : 'private'}`)
  }

  const checkedAt = new Date().toISOString().slice(0, 10)
  const map: VisibilityMap = {}
  for (const [pluginName, repo] of Object.entries(pluginRepo)) {
    map[pluginName] = { repo, public: visibilityByRepo.get(repo) === true, checkedAt }
  }

  writeFileSync(visibilityPath(STATE_DIR), JSON.stringify(map, null, 2) + '\n')
  console.log(`\nwrote ${Object.keys(map).length} plugin(s) to ${visibilityPath(STATE_DIR)}`)
}

main()
