---
name: create-stories
description: Parses a PRD and creates a structured hierarchy of GitHub issues (stories + sub-issues) with milestone assignment and project board integration. Use when the user has a PRD and wants to batch-create linked GitHub issues, create stories from a PRD, or scaffold a milestone from a product document.
user-invocable: true
allowed-tools:
  - Bash
  - Read
---

<objective>
Parse a PRD and create a parent-child GitHub issue hierarchy: story issues with linked sub-issues, all assigned to a milestone and added to the project board.
</objective>

<quick_start>
Ask the user for:
1. **Repo** — `owner/repo` (or confirm from CLAUDE.md if already in context)
2. **Milestone** — target milestone name
3. **PRD** — file path or paste content directly

Then follow the `<process>` steps below.
</quick_start>

<prd_formats>
Two accepted formats:

**Heading format:**
```markdown
## Story X.Y: Title
Description and acceptance criteria.

### Sub-Issues
- X.Y.Z: Sub-issue title
```

**List format:**
```markdown
- **Story X.Y:** Title
  - Sub-issues:
    - X.Y.Z: Sub-title
```

Parse either format. A story is identified by a numbered label like `Story 4.1` or `4.1:`. Sub-issues are identified by three-part numbers like `4.1.1`.
</prd_formats>

<process>

**Step 1 — Resolve inputs**

Read this plugin's `CLAUDE.md` (one level above `skills/`) for the managed repos list. If the target repo is listed there, suggest it as default. Ask the user to confirm or provide `owner/repo`, milestone name, and PRD source.

Verify the milestone exists:
```bash
gh api repos/{owner}/{repo}/milestones --jq '.[] | .number, .title'
```

If not found, list available milestones and ask user to choose or create one.

**Step 2 — Parse PRD**

Extract all stories and their sub-issues. For each story record:
- `number` (e.g., `4.1`)
- `title`
- `body` (description + acceptance criteria)
- `subIssues[]` — each with `number`, `title`, `description`

Show the parsed structure to the user before creating issues:
```
Epic X: Title
├─ Story X.1: Title
│  ├─ X.1.1: Sub-issue title
│  └─ X.1.2: Sub-issue title
└─ Story X.2: Title
   └─ X.2.1: Sub-issue title

Create N stories and M sub-issues? [y/n]
```

**Step 3 — Create story issues**

For each story, create the parent issue and capture its number:
```bash
gh issue create \
  --repo {owner}/{repo} \
  --title "Story {number}: {title}" \
  --body "{body}"
```

`gh issue create` outputs the URL; extract the issue number from it.

**Step 4 — Create sub-issues**

For each sub-issue, create it with a parent link in the body:
```bash
gh issue create \
  --repo {owner}/{repo} \
  --title "{number}: {title}" \
  --body "{description}

**Parent Story:** #{parent_issue_number}"
```

**Step 5 — Assign milestone**

Assign the milestone to every created issue (stories and sub-issues):
```bash
gh api repos/{owner}/{repo}/issues/{issue_number} \
  -X PATCH \
  -f milestone={milestone_number}
```

**Step 6 — Add to project board**

Attempt to add all issues to the project board. Requires `project` scope:
```bash
gh project list --owner {owner}
gh project item-add {project_number} --owner {owner} --url {issue_url}
```

If this fails due to missing scope:
```bash
gh auth refresh -s project -h github.com
```

If scope cannot be added interactively, provide the manual add-to-project instructions to the user.

**Step 7 — Link sub-issues to parents (GitHub sub-issue feature)**

After creation, attempt to set formal parent-child relationships using the GitHub GraphQL API:
```bash
gh api graphql -f query='
  mutation {
    addSubIssue(input: {issueId: "{parent_node_id}", subIssueId: "{child_node_id}"}) {
      issue { number }
    }
  }
'
```

If the mutation is unavailable, the body link from Step 4 is sufficient.

</process>

<output_format>
After all issues are created, report:

```
✅ Created N stories and M sub-issues

Story X.1 (#NNN) — Title
  ├─ #NNN — X.1.1: Sub-issue title
  └─ #NNN — X.1.2: Sub-issue title

Story X.2 (#NNN) — Title
  └─ #NNN — X.2.1: Sub-issue title

Milestone: {milestone_name}
Project board: {added / manual steps required}
```

Include direct URLs to created issues.
</output_format>

<error_handling>
- **Milestone not found** — list available milestones, ask user to choose
- **Issue creation fails** — report which succeeded and which failed; do not retry silently
- **Project scope missing** — provide `gh auth refresh -s project -h github.com` instruction and manual project-add steps
- **PRD parse fails** — show what was parsed, ask user to clarify structure
- **GraphQL sub-issue unavailable** — skip silently; body link is the fallback
</error_handling>

<success_criteria>
- All stories and sub-issues created in the correct order
- Each sub-issue body contains `**Parent Story:** #{number}`
- All issues assigned to the target milestone
- Summary table with issue numbers and URLs provided to user
- Any partial failures reported explicitly — never silently skipped
</success_criteria>
