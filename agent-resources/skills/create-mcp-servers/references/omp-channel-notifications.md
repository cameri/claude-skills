# OMP / Pi Bi-Directional Channel Communication

<overview>
MCP servers are not limited to answering tool calls. They can push real-time events back to the agent session — inbound messages, webhooks, scheduled jobs, state changes — using `notifications/claude/channel`. This reference covers the full pattern for channel servers that work in **both** Claude Code and Oh My Pi (omp): the server-side notification, the mandatory `meta.source` convention, and the omp wake-bridge extension that makes the session actually wake up.
</overview>

<channel_notifications>

## Channel Notifications

A server pushes an event with the SDK's `notification` method:

```typescript
mcp.notification({
  method: "notifications/claude/channel",
  params: {
    content: "Job fired: daily backup",   // MUST be a plain string
    meta: {
      source: "my-channel",               // MANDATORY — see below
      job_id: "abc123",
      fired_at: new Date().toISOString(),
    },
  },
});
```

<critical_rule>
**`meta.source` is mandatory.** It is the attribution key every consumer filters on — the bridge below, and Claude Code's native channel handling. A channel notification without `meta.source` is dropped silently by omp's wake bridge (the extension only accepts its own server name or a matching meta source). Set it to your channel's stable name, and keep it identical in the server, the extension, and the `.mcp.json` server key where practical.
</critical_rule>

<meta_rules>
- All meta values MUST be strings — non-string values are skipped when the bridge renders channel attributes.
- Include identifiers and timestamps (event ids, dates) so the session can act on the wake without more tool calls.
- `meta.source` becomes the `<channel source="...">` attribute in the wake; everything else in meta becomes additional attributes.
</meta_rules>

</channel_notifications>

<host_differences>

## Claude Code vs omp

| Host | Inbound handling |
|------|------------------|
| Claude Code | Natively converts `notifications/claude/channel` into `<channel source="...">` user turns, applying channel rules and the prompt-injection guard. No extra work. |
| omp (Oh My Pi) | Its MCP manager fans server notifications out to extensions via the `mcp_notification` event but never synthesizes a wake. A per-plugin extension is required. |

So a channel server ships with: the server itself (emits notifications) plus one small extension file for omp hosts. Claude Code ignores the extension; omp ignores nothing.

</host_differences>

<wake_bridge_extension>

## The omp Wake-Bridge Extension

Create `extensions/omp-channel.ts` in the plugin (canonical copy: `templates/omp-channel.ts`) and declare it in `package.json`:

```json
{
  "name": "claude-channel-my-channel",
  "type": "module",
  "bin": "./server.ts",
  "pi": {
    "extensions": ["./extensions/omp-channel.ts"]
  },
  "scripts": { "start": "bun server.ts" }
}
```

The extension listens for `mcp_notification` events, filters to `notifications/claude/channel`, re-wraps the content in the `<channel>` marker shape, and wakes the session.

<critical_rules>

**`pi.sendUserMessage` is synchronous.** It returns `undefined`, never a Promise. Chaining `.catch` on it throws `undefined is not an object (evaluating 'pi.sendUserMessage(wrapped).catch')` on every wake — the message still arrives, but the extension errors visibly. Use try/catch around a bare call.

**Call it with NO options.** omp only starts a turn for the no-options form (prompt when idle, steer while streaming). An explicit `deliverAs: "followUp"` merely queues the message and never wakes an idle session.

**Extensions load at session start, once.** Editing an extension file does not hot-reload the running session — the in-memory module is cached until the session restarts. After any extension change, restart the session before testing.

</critical_rules>

</wake_bridge_extension>

<channel_wrapping>

## Channel Wrapping Rules

The wake is the same marker shape Claude Code uses, so both hosts apply identical channel rules and injection guards:

```
<channel source="my-channel" job_id="abc123" fired_at="2026-08-29T04:31:09Z">
Job fired: daily backup
</channel>
```

- Escape `&`, `"`, `<`, `>` in every attribute value.
- Break any forged `</channel` in sender-controlled content (`replaceAll("</channel", "<\\/channel")`) so a sender cannot inject synthetic attributes or close the tag early.
- Content is the prompt; keep it short and actionable.

</channel_wrapping>

<workflow>

## Adding Channels to a Server

1. **Emit** — send `notifications/claude/channel` on every inbound event, always with `meta.source`.
2. **Bridge** — copy `templates/omp-channel.ts` to `extensions/omp-channel.ts`, set `SERVER_NAME` / `SOURCE_NAME` to your channel name, and declare the extension in `package.json` (`pi.extensions`).
3. **Restart** — the session must restart to load the extension (and the server must restart to pick up server-side changes).
4. **Test** — trigger a real event and confirm the session wakes with a `<channel>` message.

</workflow>

<testing>

## Testing

- Trigger a real event (send a message, fire a job, POST to the webhook).
- omp daemon log shows `MCP notification received` with `path: mcp:<plugin>:<server>` and `method: notifications/claude/channel` when the server's notification reaches the MCP manager.
- The session should wake with `<channel source="...">` content — check the transcript/user turn.
- Extension failures surface in the omp UI as `Extension ".../omp-channel.ts" error: ...`. `undefined is not an object` = the `.catch` bug above.
- A notification in the daemon log with no wake = the bridge filter rejected it (missing/mismatched `meta.source`, or `SERVER_NAME`/`SOURCE_NAME` constants that don't match what the server emits).

</testing>

<anti_patterns>

## Anti-Patterns

| Mistake | Symptom |
|---------|---------|
| No `meta.source` in the notification | Channel is blind — daemon receives the notification, session never wakes |
| `.catch` on `sendUserMessage` | `undefined is not an object` extension error on every wake |
| `deliverAs: "followUp"` | Message queued, idle session never wakes |
| Editing the extension without restarting | "Fix didn't take effect" — module cached at session start |
| Unescaped attributes / unbroken `</channel` | Attribute injection or forged close tags in the wake |
| Non-string meta values | Attributes silently dropped by the bridge |

</anti_patterns>
