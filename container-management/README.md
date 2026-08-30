# container-management

Claude Code skill for maintaining Docker Compose services and custom images.

## What it does

- Updates one container at a time (oldest-first by default)
- Pins image tags with sha256 digests for reproducibility
- For custom images (Containerfile/Dockerfile): updates base images and package versions
- Tests that containers build and run after every update
- Reverts automatically on failure
- Keeps an audit log at the containers root (see `CLAUDE.md`)

## Skills

| Skill | Trigger |
|-------|---------|
| `container-management` | "update containers", "maintain docker", "update <service>" |

## Usage

```
/container-management
```

Or invoke directly: "update the sops container" / "show the update log" / "which container needs updating?"
