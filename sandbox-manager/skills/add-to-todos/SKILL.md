---
name: add-to-todos
description: Adds an item to TO-DOS.md with full context from the conversation, and checks for near-duplicates first. Use when the user asks to park something, defer it, add it to the todo list, or come back to it later, rather than doing it now.
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Write
---

<essential_principles>
`TO-DOS.md` lives at the project/workspace root and is the canonical index of outstanding work for that project — check the project's own CLAUDE.md (or root-level docs) for a stated convention along those lines before assuming this is the only todo-shaped file in play. If a project keeps other todo-shaped files elsewhere, a one-line pointer entry belongs in the canonical file so those items stay discoverable rather than sitting in a file nobody checks.

Each entry must be self-contained enough that a future Claude session — possibly weeks later, with no memory of this conversation — can understand it and start work without needing to ask what it meant. That means concrete file paths (with line numbers where relevant), the actual problem being solved, and enough of the "why" to avoid re-deriving it from scratch.

Todos are plain list items, not checkboxes — an item is deleted outright from the file once work begins, never left in place with a "done"/"resolved" marker. A stale marker is worse than no entry: it makes the file lie about what's actually outstanding.
</essential_principles>

<objective>
Append a new, well-structured entry to `TO-DOS.md`, after checking whether a near-duplicate already exists, then confirm and offer to resume whatever the user was doing before this skill was invoked.
</objective>

<quick_start>
Read `TO-DOS.md`, check for a near-duplicate of the new item, then append a `## Brief Context Title - YYYY-MM-DD HH:MM` section with a `- **[Action verb] [Component]** - ...` entry carrying the required Problem and Files fields (Solution optional).
</quick_start>

<workflow>
1. Read `TO-DOS.md` in the project root (create it with the Write tool if it doesn't exist yet).

2. Check for duplicates:
   - Extract the key concept/action of the new todo.
   - Search existing todos for similar titles or overlapping scope.
   - If a likely duplicate is found, ask the user: "A similar todo already exists: [title]. Would you like to: 1. Skip adding (keep existing), 2. Replace existing with new version, 3. Add anyway as separate item." Wait for their answer before proceeding.

3. Extract the todo's content:
   - **With an explicit description given** (e.g. as a command argument or stated directly): use it as the focus/title.
   - **Without one**: analyze the recent conversation to extract the specific problem or task discussed, relevant file paths that need attention, technical details (line numbers, error messages, conflicting specifications), and the root cause if one was identified.

4. Append a new section to the bottom of the file:
   - **Heading**: `## Brief Context Title - YYYY-MM-DD HH:MM` — a 3-8 word title plus the current timestamp.
   - **Entry format**: `- **[Action verb] [Component]** - [Brief description]. **Problem:** [what's wrong or why this is needed]. **Files:** [comma-separated paths, with line numbers like path/to/file.ts:123-145]. **Solution:** [approach hints or constraints, if applicable].`
   - **Required fields**: Problem and Files.
   - **Optional field**: Solution.
   - Make the section self-contained — assume the reader has no other context.
   - Use simple list items, not checkboxes.

5. Confirm and offer to continue the original work:
   - Identify what the user was working on before this skill was invoked.
   - Confirm the todo was saved (e.g. "Saved to todos.").
   - Ask whether they want to continue with that original task, and wait for their answer.
</workflow>

<entry_format_example>
This shows the shape of the format only — write your own title, description, and file references from the actual conversation, never reuse this example's content verbatim.

```markdown
## Brief Context Title - 2026-01-15 14:23

- **Add structured format to a todo-writing skill** - Standardize entries with a Problem/Files/Solution pattern. **Problem:** Existing entries lack consistent structure, making it hard to have enough context when revisiting the task weeks later. **Files:** `skills/add-to-todos/SKILL.md:22-29`. **Solution:** Use inline bold labels with required Problem and Files fields, optional Solution field.
```
</entry_format_example>

<success_criteria>
`TO-DOS.md` contains a new, self-contained entry in the required format with Problem and Files populated, no duplicate was silently created, and the user has been asked whether to resume their prior work.
</success_criteria>
