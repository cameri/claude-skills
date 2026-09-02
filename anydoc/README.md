# anydoc

Claude Code plugin for reading office documents and PDFs as Markdown, powered by
[anydoc](https://github.com/firecrawl/anydoc) — a fast Rust library that converts
Word, PowerPoint, Excel, OpenDocument, RTF, EPUB, CSV, and PDF into clean
GitHub-Flavored Markdown. The skill shells out to the `npx` CLI, so no install is
needed beyond Node 20+.

## Skills

### `/anydoc:convert-documents-to-markdown`

Convert an office document or PDF to Markdown so its contents can be read.

```
/anydoc:convert-documents-to-markdown report.docx        # Markdown to stdout
/anydoc:convert-documents-to-markdown slides.pptx -o slides.md
/anydoc:convert-documents-to-markdown - --format csv < data.csv
```

Scanned or image-only PDFs need OCR, which anydoc does not do locally; rerun with
`--ocr hosted` to send them to Firecrawl Parse (an API key is optional but raises
the limit).

## License

MIT
