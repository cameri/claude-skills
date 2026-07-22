<required_reading>
references/config-schema.md
</required_reading>

<process>
Read `config.json` (and check whether `credentials.json` exists, without printing its
contents — wallet descriptors reveal full balance/address history and should not be echoed
to the terminal/chat unnecessarily). Display, grouped by section:

- **Household**: member names/ids.
- **Connections**: actual_budget and paperless connected status, markitdown_configured.
- **Accounts**: name, institution, ownership + owners, on_budget, reconciliation_mode, and
  whether a sync job exists.
- **Wallets**: name, kind (hot/cold), ownership + owners, and whether a sync job exists
  (never show the descriptor itself — reference `credentials.json`'s existence only).

If `config.json` doesn't exist yet, say so and offer to run `workflows/first-run-setup.md`
instead.
</process>

<success_criteria>
- Clear, readable summary covering every top-level section
- No wallet descriptor or other credential material ever printed
</success_criteria>
