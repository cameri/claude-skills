# Reference: Security Alerts, Admin & Noise Events

<security_alerts>
**Security Alerts — always notify regardless of sender:**

```
🔒 [github-manager] Security alert
Repo: {repo}
Package: {alert.dependency.package.name}
Severity: {alert.rule.security_severity_level}
Advisory: {alert.rule.description}
{alert.html_url}
```
</security_alerts>

<collaborator_changes>
**Collaborator Changes (`member` event) — always notify (informational):**

```
🟢 [github-manager] Collaborator change
Repo: {repo}
Action: {action} ({changes.role_name.to})
User: @{member.login}
```
</collaborator_changes>

<noise_events>
**Push Events:** No action (too noisy).

**Ping Events (`payload.zen` present):** No action.
</noise_events>
