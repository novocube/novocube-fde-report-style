# Changelog

## 0.2.0 - 2026-11-13

- 新增 DeepSeek Harness（DSH）原生 `.dsh/skills` 项目入口。
- 新增 `npm run install:dsh`，支持用户级、项目级和自定义目录安装。
- 为 DSH/独立安装提供技能本地 `package.json`，并增强渲染器的依赖发现。
- 将正文字体直接内嵌到渲染 HTML，避免 DSH 临时目录下的浏览器本地字体访问限制。
- 移除技能指南中的用户专属 Codex 绝对路径，改为 Codex/DSH 通用调用方式。

## 0.1.1 - 2026-11-13

- 将页眉角标改为“新魔方 · FDE REPORT”，移除 AIGC 字样。
- 保持封面默认无日期，同时新增 `--include-source-date` 和已有的 `--date` 显式日期选项。
- 随插件打包 Noto Sans CJK SC Regular/Bold 与 SIL OFL 1.1 许可证，不再依赖用户安装中文字体。

## 0.1.0 - 2026-11-13

- 首次仓库化发布。
- 增加 Codex marketplace 和可安装插件结构。
- 保存 `Novocube-fde-report-style` 为默认 PDF 风格。
- 支持蓝色封面、中文字体、页眉页码、表格、Base64 与本地图片。
- 默认去除独立日期行，并将 `Novocube`/`NOVOCUBE` 规范化为“新魔方”。
