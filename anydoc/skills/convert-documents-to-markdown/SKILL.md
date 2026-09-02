---
name: convert-documents-to-markdown
description: Use when you need the contents of a Word (.doc/.docx/.docm), PowerPoint (.ppt/.pptx), Excel (.xls/.xlsx/.xlsm/.xlsb), OpenDocument (.odt/.ods/.odp), RTF, EPUB, CSV, or PDF file that you cannot read directly. Converts office documents and PDFs to GitHub-Flavored Markdown via the anydoc CLI.
user-invocable: true
allowed-tools:
  - Read
  - Bash(npx *)
---

<objective>
Convert an office document or PDF to clean GitHub-Flavored Markdown so its contents can be read. Uses the anydoc CLI (`npx -y @firecrawl/anydoc`), which needs Node 20+ and no install.
</objective>

<quick_start>
```bash
npx -y @firecrawl/anydoc <file>              # Markdown to stdout
npx -y @firecrawl/anydoc <file> -o out.md    # write to a file
npx -y @firecrawl/anydoc - --format csv < f  # read stdin
```
</quick_start>

<context>
Supported inputs: `.doc`, `.docx`, `.docm`, `.odt`, `.rtf`, `.epub`, `.pdf`, `.ppt`, `.pps`, `.pot`, `.pptx`, `.pptm`, `.ppsx`, `.ppsm`, `.odp`, `.xls`, `.xlsx`, `.xlsm`, `.xlsb`, `.ods`, `.csv`.

The format is detected from the file content. Pass `--format <name>` only when detection cannot work: CSV from stdin, or a missing or wrong extension.

anydoc converts text-based PDFs locally but does no OCR. A PDF with scanned or image-only pages fails with exit code 3.
</context>

<workflow>
**Convert a document:**

```bash
npx -y @firecrawl/anydoc report.docx
```

Markdown goes to stdout. To keep a large document from flooding context, write it to a file and read the parts you need:

```bash
npx -y @firecrawl/anydoc report.docx -o /tmp/report.md
```

**Scanned PDF (exit code 3):** the document needs OCR. Rerun with `--ocr hosted` to send it to Firecrawl Parse (returns the same Markdown). No signup needed; pass `--api-key <key>` or set `FIRECRAWL_API_KEY` for higher limits. Only the whole document is sent — Parse has no page selection — so use this only when the scanned path is truly required.
</workflow>

<display_results>
Exit codes:
- **0** — success. Report the Markdown (or the file path if written with `-o`).
- **1** — the document could not be converted. Show the `anydoc: <message>` stderr line.
- **2** — usage error. Check the file path and flags, then retry.
- **3** — pages of a PDF need OCR. Rerun with `--ocr hosted` (see workflow).

The CLI never prompts. Failures print one `anydoc: <message>` line to stderr.
</display_results>

<common_mistakes>
- Streaming a very large document into context — write to a file with `-o` and read the sections you need instead.
- Passing `--format` for ordinary files — format is auto-detected from content; only CSV-from-stdin or mislabeled files need it.
- Expecting anydoc to OCR scanned pages locally — it exits 3; only the hosted `--ocr hosted` path handles them.
- Shelling out from a Node, Python, or Rust codebase — prefer the library (`@firecrawl/anydoc` on npm, `firecrawl-anydoc` on PyPI, `anydoc` on crates.io), which exposes the same `toMarkdown` / `to_markdown` API.
</common_mistakes>

<success_criteria>
- The document's contents are available as Markdown, either printed or written to a file
- Scanned-PDF failures correctly routed through `--ocr hosted` rather than reported as hard failures
- Exit codes mapped to the right user-facing action
</success_criteria>
