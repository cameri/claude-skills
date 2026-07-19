# Learned Reconciliation Rules

Self-updating heuristics for payee matching and transaction categorization. Updated automatically by `workflows/self-evolve.md` after each reconciliation.

Format per rule:
- `type`: `payee_mapping` | `category_assignment` | `date_offset` | `amount_quirk`
- `confidence`: `low` (applied <3×) | `medium` (applied 3–9×) | `high` (applied 10+×)
- `times_applied`: integer
- `last_seen`: YYYY-MM-DD

---

<!-- Rules are appended here by self-evolve.md -->
