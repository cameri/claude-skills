# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
