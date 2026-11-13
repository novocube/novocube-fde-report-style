# Novocube FDE Report Style

面向 Codex 的 Markdown → PDF 报告插件。默认使用 `Novocube-fde-report-style`：蓝色封面、中文报告字体、品牌页眉、页码、浅蓝表格和适配图片的 A4 排版，默认不显示日期。

## 功能

- 将 Markdown、GFM 表格和图片渲染为 A4 PDF。
- 支持 Markdown 内嵌 `data:` 图片和相对路径本地图片。
- 默认使用 `Novocube-fde-report-style`，并把正文中的 `Novocube`/`NOVOCUBE` 规范化为“新魔方”。
- 默认不显示日期；仅在显式传入 `--date` 时添加。
- 使用 Codex 内置 Node.js、`marked`、Playwright 和 Chrome；也支持独立 Node.js 环境。

## Codex 安装

克隆仓库后，将仓库注册为本地 marketplace：

```bash
codex plugin marketplace add /absolute/path/to/novocube-fde-report-style
codex plugin add novocube-fde-report-style@novocube-fde-report-style
```

安装后新建一个 Codex 任务，再使用：

```text
使用 $novocube-fde-report-style 将这份 Markdown 转成 PDF。
```

## 独立运行

需要 Node.js 20+、Chrome/Chromium，以及 `marked` 和 `playwright`：

```bash
npm install
node plugins/novocube-fde-report-style/skills/novocube-fde-report-style/scripts/md_to_pdf.mjs \
  input.md --output output.pdf
```

常用参数：

- `--title`、`--subtitle`：覆盖封面标题。
- `--brand`：覆盖页眉品牌，默认“新魔方”。
- `--date`：显式添加封面日期；默认不添加。
- `--no-replace-legacy-brand`：保留正文中的 `Novocube`。
- `--keep-html`：保留已解析图片的中间 HTML。
- `--browser`：指定 Chrome/Chromium 可执行文件。

## 仓库结构

```text
.agents/plugins/marketplace.json        Codex marketplace
plugins/novocube-fde-report-style/      插件源码
  .codex-plugin/plugin.json             插件清单
  skills/novocube-fde-report-style/     Skill、转换脚本与样式资产
scripts/validate-repo.mjs               无第三方依赖的结构校验
.github/workflows/validate.yml          GitHub Actions 校验
```

默认样式资产位于 `assets/Novocube-fde-report-style/`，其中 `reference.pdf` 是视觉基准，`style.css` 是实际渲染样式，`style.json` 保存样式 ID 与默认设置。

## 开发与发布

```bash
npm run validate
```

发布新版本前：

1. 更新 `plugins/novocube-fde-report-style/.codex-plugin/plugin.json` 中的 semver 版本。
2. 更新 `CHANGELOG.md`。
3. 运行 `npm run validate` 和真实 Markdown 渲染测试。
4. 创建对应的 `vX.Y.Z` Git tag，再推送到远端。

当前仓库保持 `UNLICENSED`，在明确开源许可前不得视为已授权公开再分发。
