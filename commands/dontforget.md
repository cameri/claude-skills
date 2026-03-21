# /dontforget

Read every file in `~/.claude/projects/-Users-cameri-Workspace-cameri-notes/remember/` and consolidate their contents into the memory system at `~/.claude/projects/-Users-cameri-Workspace-cameri-notes/memory/`.

## Steps

1. List all files in the `remember/` directory. If the directory is empty or missing, say so and stop.

2. For each file:
   a. Read its contents.
   b. Determine the best `type` for the memory: `reference` for how-to knowledge and technical formats, `feedback` for behavioral rules, `user` for user profile info, `project` for project-specific context.
   c. Check `memory/MEMORY.md` to see if a memory for this topic already exists. If yes, update the existing memory file with any new information rather than creating a duplicate.
   d. If no existing memory covers this topic, create a new file in `memory/` using the same filename as the source file in `remember/`, with the correct frontmatter:
      ```markdown
      ---
      name: <short identifier>
      description: <one-line description used to decide relevance in future conversations>
      type: <user|feedback|project|reference>
      ---

      <content>
      ```
   e. Add or update a pointer in `memory/MEMORY.md` under the appropriate section heading (`## Reference`, `## Feedback`, `## User`, `## Project`).

3. Report which files were processed and whether each was added as new or merged into an existing memory.
