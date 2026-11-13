---
name: novocube-fde-report-style
description: Convert Markdown files into polished A4 PDF reports with a blue cover, embedded images, branded headers, page numbering, Chinese typography, styled headings and tables. Use when Codex is asked to export, convert, render, or typeset .md/Markdown as PDF in the Novocube FDE report style, reproduce the saved report template, omit cover dates, or apply the default Novocube-fde-report-style.
---

# Novocube FDE Report Style

Use the bundled renderer for deterministic Markdown-to-PDF conversion. Treat `Novocube-fde-report-style` as the default and canonical style. Do not add a visible date unless the user explicitly asks for one.

## Render

1. Resolve the input Markdown path and desired output path.
2. Run the renderer with the Codex bundled Node.js runtime when available:

```bash
NODE_PATH="/Users/zemingz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
  /Users/zemingz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/md_to_pdf.mjs INPUT.md --output OUTPUT.pdf
```

If those paths do not exist, use `node` and set `NODE_PATH` to a directory containing `marked` and `playwright`. The script also searches standard Codex runtime locations automatically.

3. Preserve embedded `data:` images and inline local relative images. The renderer inlines local image files before printing.
4. Keep the default brand normalization unless the user asks to preserve legacy spelling. By default, visible `Novocube`/`NOVOCUBE` text becomes `新魔方`.
5. Verify the output exists, has the expected number of pages, contains no accidental date, and visually inspect every page for clipping or missing images. Use the PDF skill when available for visual verification.

## Options

- `--output PATH`: output PDF; defaults beside the Markdown file.
- `--title TEXT` and `--subtitle TEXT`: override cover text.
- `--brand TEXT`: override the header brand; defaults to `新魔方`.
- `--eyebrow TEXT`: override the cover eyebrow.
- `--no-replace-legacy-brand`: keep `Novocube` text in content.
- `--date TEXT`: explicitly add a date to the cover. Omit this option by default.
- `--keep-html PATH`: save the fully resolved intermediate HTML for debugging.
- `--browser PATH`: use a specific Chromium/Chrome executable.

Read [style-spec.md](references/style-spec.md) only when modifying the style or comparing a new render to the canonical template. The canonical CSS, style manifest, and reference PDF are under `assets/Novocube-fde-report-style/`.
