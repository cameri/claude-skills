# simple-english

Claude Code plugin that writes and rewrites technical text with the rules
of ASD-STE100 Simplified Technical English — the controlled language
aerospace and defense manufacturers use for maintenance documentation. The
rules exist so a tired, non-native-English reader cannot misread an
instruction. As a side effect, they strip the usual signs of AI-generated
text: long sentences, synonym rotation, hedges, filler, and decorative
clauses.

## Skills

### `simple-english:simple-english`

Use for documentation, READMEs, runbooks, procedures, error messages,
release notes, incident reports, and API guides. Also triggers when the
user says "STE", "Simplified Technical English", "ASD-STE100", "de-slop",
"make this readable", or asks for docs that translate well.

Enforces the standard's 53 rules across 9 sections: 20/25-word sentence
limits, one word one meaning, simple tenses, active voice, condition
before command. Classifies text as procedural or descriptive first, since
every other rule depends on that call, then runs a mandatory self-check
before delivering.

No credentials or external services required.

## License

MIT
