# Workflow: Handle Dependabot PR (Test → Merge → Rebase Loop)

<context>
This workflow applies when a Dependabot PR is opened or rebased for a managed repo
that runs a live service (e.g. `cameri/akkadian-agent`). The goal is to test one PR
at a time — build, start, verify, merge — then handle remaining PRs in sequence.
</context>

<repo_map>
Repos with live services and compose files:

| Repo | Local path | Compose file | Service name | Health signal |
|------|-----------|--------------|--------------|---------------|
| `cameri/akkadian-agent` | `/workspace/projects/akkadian-agent/` | `compose.yml` | `akkadian-agent` | `"Nest application successfully started"` in logs |

Repos with no live service (no build/test needed — merge directly after CI):
- `cameri/claude-skills`
- `cameri/phoenix-server`
- `phoenix-server/taches-cc-resources`
</repo_map>

<process>

## Step 1: Determine update type

```
Branch: dependabot/npm_and_yarn/...
Title:  fix: bump <pkg> from X to Y
```

- Contains `major` in branch name or title → **major update** → skip to Step 8 (notify user)
- Otherwise → **patch/minor** → continue to Step 2

---

## Step 2: Check if repo has a live service

Look up `{repo}` in the repo_map above.

- **Has live service** → continue to Step 3
- **No live service** → skip to Step 7 (merge after CI)

---

## Step 3: Check out the PR branch locally

```bash
cd /workspace/projects/akkadian-agent   # or the appropriate local path
git fetch origin {head_branch}
git checkout {head_branch}
```

Send Telegram progress update:
```
🔧 [github-manager] Testing Dependabot PR #{number}
Repo: {repo}
Branch: {head_branch}
Checking out and rebuilding...
```

---

## Step 4: Build the image

**Important:** The sandbox Docker builder is legacy (no BuildKit). Temporarily remove
`--mount=type=cache` lines from Dockerfile before building, then restore after.

```bash
cd /workspace/projects/akkadian-agent

# 1. Strip cache mount lines
sed -i 's/RUN --mount=type=cache,[^ ]* /RUN /g' Dockerfile

# 2. Build
docker compose build akkadian-agent

# 3. Restore Dockerfile from git
git checkout Dockerfile
```

If `docker compose build` fails, send failure Telegram notification and stop.

---

## Step 5: Stop and restart the container

```bash
cd /workspace/projects/akkadian-agent
docker compose stop akkadian-agent
docker compose up -d akkadian-agent
```

> **Note:** Run from the repo directory so compose volume paths resolve correctly.
> Do NOT use `docker run` — it requires manually re-specifying all env vars, ports,
> and volumes, which is error-prone.

---

## Step 6: Verify the service started cleanly

```bash
sleep 15
docker compose logs akkadian-agent --tail 20
```

Look for the health signal (e.g. `"Nest application successfully started"`).

- **Found** → proceed to Step 7
- **Not found / error in logs** → send failure notification, restore main branch, stop

Failure notification:
```
🔴 [github-manager] PR #{number} failed smoke test
Repo: {repo}
Branch: {head_branch}
Last logs:
{last 10 log lines}
```

---

## Step 7: Merge the PR

```bash
gh pr merge {number} --repo {owner}/{repo} --squash
```

Send merge confirmation:
```
✅ [github-manager] Merged Dependabot PR #{number}
Repo: {repo}
Title: {pr_title}
```

---

## Step 8: Major update — notify user

```
🟡 [github-manager] Dependabot major update — manual review needed
Repo: {repo}
PR #{number}: {title}
{url}

Merge, close, or ignore?
```

Do not proceed further without user response.

---

## Step 9: Handle remaining Dependabot PRs

After merging, Dependabot will auto-rebase open PRs. For each remaining open
Dependabot PR, wait for the rebase, then repeat from Step 1.

**Check mergeable state before proceeding:**
```bash
gh pr view {number} --repo {owner}/{repo} --json mergeable,mergeStateStatus,headRefOid
```

- `mergeable: MERGEABLE, mergeStateStatus: CLEAN` → proceed with next PR
- `mergeable: UNKNOWN` → wait ~60s and re-check (GitHub is computing)
- `mergeable: CONFLICTING, mergeStateStatus: DIRTY` → go to Step 10

---

## Step 10: Fix a dirty/conflicting Dependabot branch

### Option A: Trigger Dependabot rebase (try first)

```bash
gh pr comment {number} --repo {owner}/{repo} --body "@dependabot rebase"
```

Wait for a push to the branch (watch for webhook `action: synchronize` on the PR).
If the push arrives → check mergeable state again → proceed if clean.

If Dependabot comments **"can't authenticate to a private package registry"** →
the auto-rebase will never succeed. Go to Option B.

### Option B: Manual rebase (when Dependabot can't authenticate)

```bash
cd /workspace/projects/akkadian-agent   # or repo path
git fetch origin main {head_branch}
git checkout {head_branch}
git rebase origin/main
```

If `pnpm-lock.yaml` conflicts:
```bash
# Accept main's lockfile, then regenerate with updated dependencies
git checkout origin/main -- pnpm-lock.yaml
pnpm install --no-frozen-lockfile
git add pnpm-lock.yaml
git rebase --continue
```

If `package.json` conflicts (should not happen for single-package bumps — auto-merge
should handle it; if it doesn't, manually keep both changes):
```bash
# After resolving conflicts:
git add package.json
git rebase --continue
```

Push the rebased branch:
```bash
git push origin {head_branch} --force
```

Send update:
```
🔧 [github-manager] Manually rebased PR #{number} onto main
Repo: {repo}
Branch: {head_branch}
```

Wait for `action: synchronize` webhook → re-check mergeable state → proceed from Step 1.

</process>

<success_criteria>
This workflow is complete when:
- [ ] PR branch checked out and image built successfully
- [ ] Container started via `docker compose up -d` (not `docker run`)
- [ ] Health signal confirmed in logs
- [ ] PR merged with `--squash`
- [ ] Remaining PRs rebased (auto or manual) before proceeding to next
</success_criteria>
