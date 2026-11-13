---
name: novocube-fde-report-style
description: Convert Markdown files into polished A4 PDF reports with a blue cover, embedded images, branded headers, page numbering, Chinese typography, styled headings and tables. Use when Codex or DeepSeek Harness (DSH) is asked to export, convert, render, or typeset .md/Markdown as PDF in the Novocube FDE report style, reproduce the saved report template, omit cover dates, or apply the default Novocube-fde-report-style.
---

# Novocube FDE Report Style

Use the bundled renderer for deterministic Markdown-to-PDF conversion. Treat `Novocube-fde-report-style` as the default and canonical style. Default to no visible date, but honor an explicit request to add a date. Use the bundled Noto Sans CJK SC fonts; never require the user to install fonts.

## Render

1. Resolve the input Markdown path and desired output path.
2. Resolve the skill directory (the folder containing this `SKILL.md`) and run the bundled renderer:

```bash
SKILL_DIR="/absolute/path/to/novocube-fde-report-style"
node "$SKILL_DIR/scripts/md_to_pdf.mjs" INPUT.md --output OUTPUT.pdf
```

In DSH, resolve this from the loaded skill's resource directory; in Codex, use the absolute path of this installed skill. The renderer searches skill-local dependencies, repository dependencies, `NODE_PATH`, and the standard Codex runtime. If `marked` or `playwright` is unavailable in a standalone/DSH installation, run `npm install` once in the skill directory. If Chrome/Chromium is unavailable, run `npx playwright install chromium` there or pass `--browser PATH`.

3. Preserve embedded `data:` images and inline local relative images. The renderer inlines local image files before printing.
4. Keep the default brand normalization unless the user asks to preserve legacy spelling. By default, visible `Novocube`/`NOVOCUBE` text becomes `新魔方`.
5. Keep the top-right header label brand-specific: `${brand} · FDE REPORT`. Do not put `AIGC` or `AGIC` in that label.
6. Verify the output exists, has the expected number of pages, follows the requested date mode, and visually inspect every page for clipping, font fallback, or missing images. Use the PDF skill when available for visual verification.

## Options

- `--output PATH`: output PDF; defaults beside the Markdown file.
- `--title TEXT` and `--subtitle TEXT`: override cover text.
- `--brand TEXT`: override the header brand; defaults to `新魔方`.
- `--eyebrow TEXT`: override the cover eyebrow.
- `--no-replace-legacy-brand`: keep `Novocube` text in content.
- `--date TEXT`: explicitly add the supplied date to the cover. Omit this option by default.
- `--include-source-date`: use a frontmatter date or standalone source date on the cover. This is opt-in.
- `--keep-html PATH`: save the fully resolved intermediate HTML for debugging.
- `--browser PATH`: use a specific Chromium/Chrome executable.

Read [style-spec.md](references/style-spec.md) only when modifying the style or comparing a new render to the canonical template. The canonical CSS, style manifest, reference PDF, bundled fonts, and font license are under `assets/Novocube-fde-report-style/`.
