# consider

Claude Code plugin that applies a proven decision-making or thinking-model
framework — inversion, first-principles, second-order effects, Pareto, via
negativa, opportunity cost, or Eisenhower prioritization — to a real decision
or tradeoff moment.

## Design

The source project ([TÂCHES Claude Code Resources](https://github.com/glittercowboy/taches-cc-resources))
exposes these as 7 of its 12 separate `/consider:*` slash commands, each
naming one framework. This plugin instead folds all 7 into a single
auto-triggering skill, `consider`, that picks the framework(s) that fit the
situation rather than making the user name one — and, more importantly,
avoids having 7 near-identical skills all competing to auto-trigger on the
same kind of decision moment. The underlying framework write-ups (the
process steps and output shapes for each) are adapted from that project
(MIT-licensed); the skill itself is a fresh router built on top of them.

## Skills

| Skill | Command | Description |
|---|---|---|
| consider | `/consider:consider` | Apply a decision-making framework to a real choice, tradeoff, or risky plan |

## License

MIT
