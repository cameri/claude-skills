# autoresearch

Autonomously optimize Claude Code skills using [Karpathy's autoresearch methodology](https://github.com/karpathy/autoresearch).

The core idea: give an AI agent your SKILL.md and a set of binary yes/no eval questions. The agent runs the skill against test tasks, evaluates outputs, mutates the SKILL.md to fix failures, and repeats — exactly as autoresearch does for ML training code. You come back to a better skill.

## Skills

| Skill | Description |
|---|---|
| `autoresearch:optimize-skill` | Autonomous skill optimization loop — define evals, establish baseline, iterate until perfect pass rate |

## How it works

Adapted from Karpathy's autoresearch:

| ML autoresearch | Skill autoresearch |
|---|---|
| `val_bpb` (lower is better) | eval pass rate (higher is better) |
| `train.py` | `SKILL.md` |
| 5-minute training run | N eval runs against test tasks |
| git commit + branch | jj change |
| Keep/discard on val_bpb | Keep/discard on pass rate |

The agent follows a tight loop: mutate → simulate N runs → score → keep or revert → mutate again. It never stops to ask "should I continue?" — it runs until the skill scores perfect or you interrupt it.

## Usage

```
/autoresearch:optimize-skill
```

Provide:
1. Path to the SKILL.md you want to optimize
2. Binary yes/no eval questions (or let the agent generate them)
3. Test tasks (or let the agent generate 2–3 representative ones)

## Design principles

- **Binary evals only** — No 1–7 scales. Yes/no only.
- **Run N times** — Prompts are noisy. Score = average over 5–10 runs.
- **Simplicity criterion** — Equal score + shorter SKILL.md = keep the shorter one.
- **One change per experiment** — Know what caused each improvement.
- **Never stop** — Autonomous until perfect or interrupted.

## Source

Based on [`projects/Autoresearch`](../Autoresearch/) — see that project for the original ML training implementation.
