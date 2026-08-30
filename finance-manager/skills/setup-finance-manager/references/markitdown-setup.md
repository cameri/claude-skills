<overview>
Paperless-ngx's default PDF parser (Tesseract/OCRmyPDF) works fine on scanned images but
produces garbled or incomplete text on digital (text-based) PDFs — which is what most bank
statements are. Microsoft's MarkItDown library (pdfminer + pdfplumber) extracts clean text
and tables from digital PDFs, which matters a lot for `reconcile-statement`'s
content-matching and extraction quality. If the paperless-ngx instance being connected
during setup doesn't already have MarkItDown configured, offer to set it up.
</overview>

<when_to_offer>
During `connect-services` (paperless connection step), after credentials are saved: ask
whether documents will be digital-native PDFs (bank/institution-generated statements,
typically) or scanned images. If digital-native and MarkItDown isn't already registered,
offer this setup. Skip if the instance is scan-only (Tesseract is already the right tool)
or if MarkItDown is already active (check via the paperless-ngx admin/API for a registered
parser handling `application/pdf` with a score above Tesseract's default of 10).
</when_to_offer>

<pattern>
Paperless-ngx (2.20.x+) discovers parsers via Django's `document_consumer_declaration`
signal — the same mechanism Tesseract and Tika use. A local Python package is:

1. Mounted read-only into the paperless-ngx container as a bind volume.
2. Installed at container startup via paperless-ngx's custom-init-scripts mechanism
   (a numbered shell script under whatever directory that instance mounts for init scripts).
3. Activated by adding the package's Django app name to the `PAPERLESS_APPS` environment
   variable, so it registers in `INSTALLED_APPS`.

The package needs:
- `pyproject.toml` declaring `markitdown[pdf]` as a dependency.
- An `AppConfig` whose `ready()` connects to `document_consumer_declaration` and returns a
  parser class + score (must beat Tesseract's 10 — score 15 works) for `application/pdf`.
- The parser class itself (`DocumentParser` subclass) that runs `markitdown` on the PDF and
  falls back to returning empty output on failure, so paperless-ngx's own fallback chain can
  hand the document to Tesseract instead of the pipeline crashing.
- `can_produce_archive = True` on the parser, or the OCR fallback path breaks.

Compose changes needed on the paperless-ngx service: add the read-only volume mount for the
package, and add `PAPERLESS_APPS: <package's_django_app_name>` to its environment.
</pattern>

<worked_example>
This exact pattern is already implemented for this workspace's own paperless-ngx instance
(the package source and full design writeup live in this workspace's container/spec docs —
including the exact `pyproject.toml`/`apps.py`/`signals.py`/`parser.py` contents and the
init script). For a new instance, adapt: locate the target paperless-ngx compose file and
its custom-init-scripts directory, then apply the package requirements above — don't
assume any specific directory layout.
</worked_example>
