# research-tools

Claude Code plugin for deliberately-invoked research work — competitive
analysis, deep-dive investigation, feasibility checks, landscape mapping,
options comparison, and technical implementation research. Adapted from the
[TÂCHES Claude Code Resources](https://github.com/glittercowboy/taches-cc-resources)
project's `/research:*` slash commands.

## Skills

| Skill | Command | Description |
|---|---|---|
| competitive | `/research-tools:competitive` | Research the competitive landscape for a product or feature — who else solves this, how, and where the gaps are |
| deep-dive | `/research-tools:deep-dive` | Comprehensive, multi-source investigation of a topic — how it works, why it exists, limitations, current trends |
| feasibility | `/research-tools:feasibility` | Honest reality check — can this actually be done given technical, resource, and external constraints |
| landscape | `/research-tools:landscape` | Map a domain's players, tools, trends, and gaps |
| options | `/research-tools:options` | Structured side-by-side comparison of options with a recommendation |
| technical | `/research-tools:technical` | Research implementation approaches, libraries, and patterns with honest tradeoffs |

## Design

All 6 skills are **deliberate-invocation only** — each `description` is
written so it must be asked for by name or clear explicit intent, not
ambient trigger language. Real research (web search/fetch across multiple
sources) is a genuine token cost, and this workspace's own norm — see the
Usage Awareness section of its root operating instructions — is not to kick
off expensive, open-ended work unprompted. None of these 6 should ever
auto-fire on a passing mention of "research" or "compare"; they fire only
when a user actually asks for that kind of investigation.

This content is adapted from `phoenix-server/taches-cc-resources` (MIT-licensed).

## License

MIT
