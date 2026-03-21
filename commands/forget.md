# /forget

Analyze every file in `~/.claude/projects/-Users-cameri-Workspace-cameri-notes/remember/` and triage each one into: keep, compress, or delete.

## Steps

1. List all files in the `remember/` directory. If empty or missing, say so and stop.

2. For each file, read its contents and assign one of three dispositions:

   **Keep** — leave the file untouched:
   - Documents a non-obvious format, schema, or protocol that takes real effort to rediscover.
   - Captures a decision, rule, or convention that actively guides future behavior.
   - Contains information hard to find or requiring multiple steps to retrieve.
   - Likely to be referenced often.

   **Compress** — replace the file with a short summary stub:
   - Useful to have around but not referenced frequently enough to justify the full detail.
   - The key insight fits in 3–5 lines; the rest is boilerplate or can be re-derived from the stub.
   - Worth knowing it exists and where to look, but not worth loading in full every time.

   **Delete** — remove entirely:
   - Trivially googleable or derivable from reading the code/docs in under a minute.
   - Fully duplicates an existing memory file with nothing new to add.
   - Ephemeral — temporary state, in-progress task, or one-time action with no lasting relevance.
   - A log, summary, or status snapshot with no instructional value.

3. Present the triage plan — one line per file showing its disposition and reason.

4. Apply triage plan changes immediately:
   - **Keep**: no changes.
   - **Compress**: overwrite the file in `remember/` with a stub in this format:
     ```markdown
     # <Title> (compressed)

     <3–5 line summary of the key insight or what this was about>

     > Full details were compressed. Key pointer: <where to find more if needed, e.g. a URL, file path, or command>.
     ```
     Also update (or compress) the corresponding entry in `memory/` if one exists.
   - **Delete**: remove the file from `remember/`. Also remove the corresponding entry from `memory/MEMORY.md` and delete its memory file in `memory/` if present.

5. Report what was kept, compressed, and deleted.
