# Novocube-fde-report-style

`Novocube-fde-report-style` is the default PDF target style for this plugin.

## Page system

- A4 portrait with print backgrounds enabled.
- White cover with blue geometric accents and centered title hierarchy.
- No visible cover date by default.
- Compact `新魔方 · FDE REPORT` brand header at the top right; never use `AIGC` or `AGIC` in this label.
- Centered `current / total` page numbering.

## Visual tokens

| Role | Value |
| --- | --- |
| Primary blue | `#174A82` |
| Accent blue | `#1A5AA6` |
| Pale blue | `#DCE9F7` |
| Zebra row | `#F5F8FC` |
| Rule blue | `#B8CBE2` |
| Main text | `#162033` |
| Muted text | `#566173` |

Use the bundled `Noto Sans CJK SC` Regular/Bold files for all report text, headers, and page numbers. Do not depend on a system font installation. Headings use a dark blue hierarchy. Level-two headings have a blue left rule and pale underline. Tables use a pale blue header, alternating rows, thin blue-gray borders, and repeated headers when Chromium can paginate them.

## Canonical assets

- `assets/Novocube-fde-report-style/style.css`: executable print style.
- `assets/Novocube-fde-report-style/style.json`: style identity and defaults.
- `assets/Novocube-fde-report-style/reference.pdf`: the visual source of truth supplied by the user.
- `assets/Novocube-fde-report-style/fonts/`: bundled Noto Sans CJK SC Regular/Bold and SIL OFL 1.1.

When changing CSS, compare all output pages against `reference.pdf`, especially cover balance, Chinese glyph rendering, table row breaks, image scaling, header clearance, and footer position.
