---
name: Configure Plugin Access
description: Help users configure authentication, authorization, and remote access for plugins and skills.
---

<objective>
Configure plugin access requirements (authentication credentials, authorization tokens, remote URLs, API keys). Use this workflow when a plugin needs to establish connections to external services, set up credentials, or configure access controls.
</objective>

<required_reading>
- [references/portability.md](../references/portability.md) — How to avoid hardcoding access credentials
- [references/api-security.md](../references/api-security.md) — Security patterns for API access
</required_reading>

<process>

**Step 1: Identify Access Type**
Determine what kind of access the plugin needs:
- **Authentication** — Identity (API keys, OAuth tokens, credentials)
- **Authorization** — Permissions (scopes, access levels, role-based control)
- **Remote Configuration** — URLs, endpoints, service discovery

**Step 2: Document Access Requirements**
In the plugin's README.md or CLAUDE.md, document:
- What access is required
- How to obtain credentials/tokens
- Where credentials are stored locally (env vars, config files)
- Scope/permissions needed
- Security considerations

**Step 3: Create or Update Access Workflow**
If the plugin provides an access skill or workflow:
- Document the setup steps clearly
- Never hardcode URLs or credentials in the skill
- Store sensitive data in environment variables or local config files
- Provide clear error messages if access fails

**Step 4: Test Access Configuration**
- Verify credentials work with the target service
- Test that the plugin can authenticate successfully
- Document any errors or edge cases

**Step 5: Document for Users**
Create a setup guide that covers:
- Prerequisites (accounts, API keys needed)
- Step-by-step configuration instructions
- Troubleshooting common auth failures
- Security best practices

</process>

<success_criteria>
Access configuration is complete when:
- Plugin can authenticate to required services
- Authorization scopes/permissions are properly set
- No sensitive credentials are hardcoded in code
- Users have clear documentation on how to set up access
- Error messages guide users when auth fails
</success_criteria>
