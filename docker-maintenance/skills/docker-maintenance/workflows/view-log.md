# Workflow: View Update Log

<process>
<view>
Read and display `/workspace/containers/UPDATE-LOG.md`.

Summarize:
- Total updates attempted
- Success vs failure rate
- Most recently updated container
- Containers never updated (compare log entries against all service dirs)
</view>

<init>
**If UPDATE-LOG.md does not exist**, create it:

```markdown
# Container Update Log

> Managed by the `docker-maintenance` skill.
> One entry per update attempt. Format: date, service, type, changes, result.

---
```

Then list all service directories found under `/workspace/containers/` so the user knows what's available to update.
</init>
</process>

<success_criteria>
- [ ] Log displayed (or created if missing)
- [ ] Summary of update history shown
- [ ] Containers not yet in the log are identified
</success_criteria>
