---
name: check-todos
description: Lists outstanding items from TO-DOS.md and helps pick one to work on next. Use when the user asks what's outstanding, what's on the todo list, or wants to pick up parked work.
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Glob
---

<essential_principles>
Once the user chooses to start work on a todo (or invoke a matching skill for it), remove that entry from `TO-DOS.md` outright — and remove its `##` heading too if the section becomes empty. Never leave it in place with a "done" or "resolved" marker; a todo file that still lists finished work no longer tells the truth about what's outstanding. Only entries the user chooses to keep browsing (put back) or explicitly defers stay in the file.
</essential_principles>

<objective>
Read `TO-DOS.md`, present outstanding items as a numbered list, let the user pick one, load its full context, check whether an existing skill or workflow already fits it, and then either hand off to that skill, start the work directly, or brainstorm — removing the entry from the file once work actually begins.
</objective>

<quick_start>
Read `TO-DOS.md`, list the outstanding items as a numbered list, and wait for the user to reply with a number before loading that item's full context.
</quick_start>

<workflow>
1. Read `TO-DOS.md` in the project root. If it doesn't exist, say "No outstanding todos" and stop.

2. Parse and display todos:
   - Extract all list items starting with `- **` (active todos).
   - If none exist, say "No outstanding todos" and stop.
   - Display a compact numbered list showing, for each: its number (for selection), the bold title (the text between the first `**` markers), and the date from the `##` heading above it.
   - Prompt: "Reply with the number of the todo you'd like to work on."
   - Wait for the user to reply with a number.

3. Load full context for the selected todo:
   - Display the complete entry line, with all fields (Problem, Files, Solution).
   - Display the `##` heading (topic + date) above it for additional context.
   - Read and briefly summarize the files it mentions.

4. Check for an established workflow:
   - Read the project's CLAUDE.md, if one exists, for project-specific workflows and rules.
   - Look for a `.claude/skills/` directory or installed plugins whose domain matches the todo.
   - Match the todo's file paths to domain patterns (e.g. a path under a specific plugin's directory suggests that plugin's own workflow).
   - Check CLAUDE.md for any explicit workflow requirement for this kind of work.

5. Present options to the user:
   - **If a matching skill/workflow was found**: "This looks like [domain] work. Would you like to: 1. Invoke [skill-name] and start, 2. Work on it directly, 3. Brainstorm approach first, 4. Put it back and browse other todos."
   - **If no match was found**: "Would you like to: 1. Start working on it, 2. Brainstorm approach first, 3. Put it back and browse other todos."
   - Wait for the user's response.

6. Handle the choice:
   - **Invoke skill / Start working**: remove the todo entry from `TO-DOS.md` (and its `##` heading too, if the section is now empty), then begin the work — invoking the matched skill if one applies, or proceeding directly otherwise.
   - **Brainstorm approach**: keep the todo in the file, and work through the approach with the todo's description as the starting point.
   - **Put it back**: keep the todo in the file, and return to step 2 to redisplay the full list.
</workflow>

<display_format_example>
This shows the display shape only — populate it from the real contents of `TO-DOS.md`, never from this example.

```
Outstanding Todos:

1. Add structured format to a todo-writing skill (2026-01-15 14:23)
2. Build a companion todo-review skill (2026-01-15 14:23)
3. Fix a broken integration workflow (2026-01-14 09:15)

Reply with the number of the todo you'd like to work on.
```
</display_format_example>

<success_criteria>
The user was shown an accurate numbered list of current entries, selected one, saw its full context, and either the entry was removed from `TO-DOS.md` because work began, or it was deliberately kept because the user chose to defer or browse further.
</success_criteria>
