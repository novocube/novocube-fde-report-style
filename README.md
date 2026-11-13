# Novocube FDE Report Style

面向 Codex 和 DeepSeek Harness（DSH）的 Markdown → PDF 报告技能。默认使用 `Novocube-fde-report-style`：蓝色封面、中文报告字体、品牌页眉、页码、浅蓝表格和适配图片的 A4 排版，默认不显示日期。

## 功能

- 将 Markdown、GFM 表格和图片渲染为 A4 PDF。
- 封面和正文右上角使用“新魔方 · FDE REPORT”，不使用 `AIGC`/`AGIC` 角标。
- 支持 Markdown 内嵌 `data:` 图片和相对路径本地图片。
- 默认使用 `Novocube-fde-report-style`，并把正文中的 `Novocube`/`NOVOCUBE` 规范化为“新魔方”。
- 默认不显示日期；可用 `--date` 指定日期，或用 `--include-source-date` 采用 Markdown 中的日期。
- 随插件提供 Noto Sans CJK SC Regular/Bold，渲染时直接加载并嵌入 PDF，用户无需安装字体。
- 支持 Codex marketplace 和 DSH 原生 `SKILL.md` 发现。
- 使用 Node.js、`marked`、Playwright 和 Chrome/Chromium；Codex 可使用内置运行时，DSH 安装器会安装技能本地依赖。

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

## DSH 安装

DSH 支持标准 `SKILL.md` 技能。克隆仓库后执行：

```bash
npm run install:dsh
```

安装器默认将技能复制到 `${DSH_HOME:-~/.dsh}/skills/novocube-fde-report-style` 并安装运行依赖。已存在时使用：

```bash
npm run install:dsh -- --force
```

仅安装到某个 DSH 项目：

```bash
npm run install:dsh -- --project /absolute/path/to/project
```

安装器会优先使用系统 Chrome/Chromium；如果未找到，会为 Playwright 安装 Chromium。可用 `--skip-browser` 跳过浏览器安装，随后在转换时用 `--browser PATH` 指定。

安装后可用 DSH 的 `/skills` 检查，并用 `/novocube-fde-report-style` 调用。本仓库自身也提供 `.dsh/skills/` 项目入口，在仓库内启动 DSH 时无需额外安装。

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
- `--date`：显式添加指定封面日期；默认不添加。
- `--include-source-date`：从 frontmatter 或独立日期行读取日期并显示在封面。
- `--no-replace-legacy-brand`：保留正文中的 `Novocube`。
- `--keep-html`：保留已解析图片的中间 HTML。
- `--browser`：指定 Chrome/Chromium 可执行文件。

## 仓库结构

```text
.agents/plugins/marketplace.json        Codex marketplace
.dsh/skills/novocube-fde-report-style/ DSH 项目技能入口
plugins/novocube-fde-report-style/      插件源码
  .codex-plugin/plugin.json             插件清单
  skills/novocube-fde-report-style/     Skill、转换脚本与样式资产
scripts/install-dsh.mjs                 DSH 用户级/项目级安装器
scripts/validate-repo.mjs               无第三方依赖的结构校验
.github/workflows/validate.yml          GitHub Actions 校验
```

默认样式资产位于 `assets/Novocube-fde-report-style/`，其中 `reference.pdf` 是视觉基准，`style.css` 是实际渲染样式，`style.json` 保存样式 ID 与默认设置，`fonts/` 包含 Noto Sans CJK SC Regular/Bold 和 SIL OFL 1.1 许可证。

## 开发与发布

```bash
npm run validate
```

发布新版本前：

1. 同步更新根目录、Codex 插件和技能运行包的 semver 版本。
2. 更新 `CHANGELOG.md`。
3. 运行 `npm run validate` 和真实 Markdown 渲染测试。
4. 创建对应的 `vX.Y.Z` Git tag，再推送到远端。

当前仓库保持 `UNLICENSED`，在明确开源许可前不得视为已授权公开再分发。
