# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [technitium-dns 0.2.1] - 2026-03-28

### Changed
- Renamed `configure-technitium` skill to `access` to follow the standard plugin naming convention

## [home-assistant 0.1.0] - 2026-03-28

### Added
- Initial release: interact with Home Assistant via REST API using httpie
- `access` skill: configure HA_URL and HA_TOKEN, test connection
- `get-state` skill: get single entity state or list all entities (with domain filter)
- `call-service` skill: call HA services to control devices and trigger automations
- `set-state` skill: create or update entity state directly in HA state machine
- `fire-event` skill: fire custom HA events for automation triggers
- `render-template` skill: render Jinja2 templates for testing and debugging
- `query-history` skill: query state history and logbook with time range filters

## [autoresearch 0.1.1] - 2026-03-28

### Added
- Initial release: autonomously optimize Claude Code skills using binary evals, prompt mutation, and iterative improvement loops

## [docker-maintenance 0.2.0] - 2026-03-28

### Added
- Initial release: update base images, pin sha256 digests, manage Containerfile/Dockerfile dependencies, test builds, and log changes

## [netshoot 0.1.0] - 2026-03-28

### Added
- Initial release: network troubleshooting inside Docker container networks using nicolaka/netshoot

## [elevenlabs 0.1.1] - 2026-03-28

### Added
- `references/premade-voices.md`: full list of 45 premade voices with IDs, gender, accent, and use case
- Credit conservation guidance in text-to-speech skill (avoid filler text to reduce character usage)
- Expanded voice table with accent and use case details

## [jj] - 2026-03-28

### Added
- Document that jj does not support git submodules; use `git` directly for submodule operations
- Warning about `jj restore` accidentally deleting files that are absent in the source revision, with pre-flight checklist

## [technitium-dns 0.2.0] - 2026-03-28

### Added
- `manage-blocking` skill: check if a domain is blocked or allowed, add/remove per-domain allow/block overrides, manage block list URLs, force block list updates, and enable/disable blocking globally (including timed temporary disable)
- `.claude-plugin/plugin.json`: initial plugin manifest (was missing)
- Updated marketplace.json description to reflect blocking capabilities
