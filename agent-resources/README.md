# agent-resources

Claude Code plugin for building and auditing the pieces that extend Claude Code itself — skills, hooks, MCP servers, and subagents. Adapted from the [TÂCHES Claude Code Resources](https://github.com/glittercowboy/taches-cc-resources) project.

## Skills

| Skill | Command | Description |
|---|---|---|
| create-agent-skills | `/agent-resources:create-agent-skills` | Expert guidance for creating, writing, building, and refining Claude Code Skills |
| create-hooks | `/agent-resources:create-hooks` | Create Claude Code hooks (PreToolUse, PostToolUse, Stop, SessionStart, UserPromptSubmit) |
| create-mcp-servers | `/agent-resources:create-mcp-servers` | Expert guidance for building MCP servers for Claude integrations (Python/TypeScript) |
| create-subagents | `/agent-resources:create-subagents` | Expert guidance for creating, building, and using Claude Code subagents |
| audit-skill | `/agent-resources:audit-skill` | Audit a SKILL.md file for YAML compliance, pure XML structure, progressive disclosure, and best practices |
| audit-subagent | `/agent-resources:audit-subagent` | Audit a subagent configuration file for role definition, prompt quality, and tool selection |
| heal-skill | `/agent-resources:heal-skill` | Apply corrections to a skill's SKILL.md based on mistakes discovered during execution, with approval workflow |

This content is adapted from `phoenix-server/taches-cc-resources` (MIT-licensed).

## License

MIT
