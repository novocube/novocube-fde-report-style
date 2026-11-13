#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

function fail(message, code = 1) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function help() {
  console.log(`Usage: md_to_pdf.mjs INPUT.md [options]

Options:
  --output PATH                 Output PDF path
  --title TEXT                  Cover title override
  --subtitle TEXT               Cover subtitle override
  --brand TEXT                  Header brand (default: 新魔方)
  --eyebrow TEXT                Cover eyebrow
  --date TEXT                   Explicit cover date; omitted by default
  --style NAME                  Style name (default: Novocube-fde-report-style)
  --no-replace-legacy-brand     Preserve Novocube/NOVOCUBE in content
  --keep-html PATH              Save resolved intermediate HTML
  --browser PATH                Chromium/Chrome executable
  --help                        Show this help`);
}

function parseArgs(argv) {
  const out = {
    input: null,
    output: null,
    title: null,
    subtitle: null,
    brand: "新魔方",
    eyebrow: null,
    date: null,
    style: "Novocube-fde-report-style",
    replaceLegacyBrand: true,
    keepHtml: null,
    browser: null,
  };
  const valueOptions = new Map([
    ["--output", "output"],
    ["--title", "title"],
    ["--subtitle", "subtitle"],
    ["--brand", "brand"],
    ["--eyebrow", "eyebrow"],
    ["--date", "date"],
    ["--style", "style"],
    ["--keep-html", "keepHtml"],
    ["--browser", "browser"],
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      help();
      process.exit(0);
    }
    if (arg === "--no-replace-legacy-brand") {
      out.replaceLegacyBrand = false;
      continue;
    }
    if (valueOptions.has(arg)) {
      if (i + 1 >= argv.length) fail(`${arg} requires a value`, 2);
      out[valueOptions.get(arg)] = argv[++i];
      continue;
    }
    if (arg.startsWith("-")) fail(`unknown option: ${arg}`, 2);
    if (out.input) fail(`only one input Markdown file is supported: ${arg}`, 2);
    out.input = arg;
  }
  if (!out.input) fail("missing input Markdown file", 2);
  if (out.style !== "Novocube-fde-report-style") {
    fail(`unsupported style '${out.style}'; available: Novocube-fde-report-style`, 2);
  }
  return out;
}

function moduleSearchPaths() {
  const home = os.homedir();
  return [
    process.env.NODE_PATH,
    process.env.CODEX_NODE_PATH,
    path.join(home, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"),
    path.join(process.cwd(), "node_modules"),
  ].filter(Boolean);
}

function loadDependency(name) {
  try {
    const resolved = require.resolve(name, { paths: moduleSearchPaths() });
    return require(resolved);
  } catch (error) {
    fail(`cannot load '${name}'. Run with Codex bundled Node.js or set NODE_PATH. ${error.message}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function replaceLegacyBrand(text, brand) {
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(/Novocube/gi, brand)
    .replace(new RegExp(`([\\u4e00-\\u9fff])\\s+${escapedBrand}`, "g"), `$1${brand}`)
    .replace(new RegExp(`${escapedBrand}\\s+([\\u4e00-\\u9fff])`, "g"), `${brand}$1`);
}

function extractFrontMatter(markdown) {
  if (!markdown.startsWith("---\n")) return { markdown, meta: {} };
  const end = markdown.indexOf("\n---\n", 4);
  if (end < 0) return { markdown, meta: {} };
  const raw = markdown.slice(4, end);
  const meta = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (match) meta[match[1].toLowerCase()] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return { markdown: markdown.slice(end + 5), meta };
}

function deriveDocument(markdown, options) {
  const front = extractFrontMatter(markdown.replaceAll("\r\n", "\n"));
  let body = front.markdown;
  const heading = body.match(/^\s*#\s+(.+?)\s*$/m);
  const sourceTitle = options.title || front.meta.title || (heading ? heading[1].trim() : path.parse(options.input).name);
  if (heading) body = `${body.slice(0, heading.index)}${body.slice(heading.index + heading[0].length)}`;

  body = body.replace(/^\s*(?:date\s*:\s*)?\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?\s*$/gim, "");
  body = body.replace(/^\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*$/gim, "");
  body = body.replace(/^\s*[A-Za-z]+\s+\d{1,2},\s+\d{4}\s*$/gim, "");

  let title = sourceTitle;
  let subtitle = options.subtitle;
  if (!subtitle) {
    const parts = sourceTitle.split(/[:：]/, 2);
    if (parts.length === 2) {
      [title, subtitle] = parts.map((part) => part.trim());
    }
  }
  if (options.replaceLegacyBrand) {
    body = replaceLegacyBrand(body, options.brand);
    title = replaceLegacyBrand(title, options.brand);
    if (subtitle) subtitle = replaceLegacyBrand(subtitle, options.brand);
  }
  return {
    body: body.trim(),
    title: title.trim(),
    subtitle: subtitle ? subtitle.trim() : "",
    meta: front.meta,
  };
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return new Map([
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".gif", "image/gif"],
    [".webp", "image/webp"],
    [".svg", "image/svg+xml"],
    [".bmp", "image/bmp"],
    [".tif", "image/tiff"],
    [".tiff", "image/tiff"],
  ]).get(ext) || "application/octet-stream";
}

async function inlineLocalImages(html, baseDir) {
  const imagePattern = /(<img\b[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi;
  let cursor = 0;
  let output = "";
  for (const match of html.matchAll(imagePattern)) {
    output += html.slice(cursor, match.index);
    const src = match[2];
    if (/^(?:data:|https?:|file:|#)/i.test(src)) {
      output += match[0];
    } else {
      const clean = decodeURIComponent(src.split(/[?#]/, 1)[0]);
      const filePath = path.resolve(baseDir, clean);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        fail(`image not found: ${src} (resolved to ${filePath})`);
      }
      const data = fs.readFileSync(filePath).toString("base64");
      output += `${match[1]}data:${mimeFor(filePath)};base64,${data}${match[3]}`;
    }
    cursor = match.index + match[0].length;
  }
  output += html.slice(cursor);
  return output;
}

function findBrowser(options, chromium) {
  const candidates = [
    options.browser,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  try {
    const bundled = chromium.executablePath();
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {
    // Let Playwright report a useful launch error if no executable is found.
  }
  return null;
}

function buildHtml({ css, contentHtml, title, subtitle, eyebrow, date }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml([title, subtitle].filter(Boolean).join("："))}</title>
  <style>${css}</style>
</head>
<body>
  <section class="cover">
    <div class="cover-eyebrow">${escapeHtml(eyebrow)}</div>
    <h1 class="cover-title">${escapeHtml(title)}</h1>
    ${subtitle ? `<div class="cover-subtitle">${escapeHtml(subtitle)}</div>` : ""}
    ${date ? `<div class="cover-date">${escapeHtml(date)}</div>` : ""}
  </section>
  <main>${contentHtml}</main>
</body>
</html>`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  options.input = path.resolve(options.input);
  if (!fs.existsSync(options.input) || !fs.statSync(options.input).isFile()) {
    fail(`input file not found: ${options.input}`);
  }
  options.output = path.resolve(options.output || path.join(path.dirname(options.input), `${path.parse(options.input).name}.pdf`));
  if (path.extname(options.output).toLowerCase() !== ".pdf") fail("output path must end in .pdf", 2);

  const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const styleRoot = path.join(skillRoot, "assets", "Novocube-fde-report-style");
  const css = fs.readFileSync(path.join(styleRoot, "style.css"), "utf8");
  const markdown = fs.readFileSync(options.input, "utf8");
  const document = deriveDocument(markdown, options);
  const { marked } = loadDependency("marked");
  const { chromium } = loadDependency("playwright");
  marked.setOptions({ gfm: true, breaks: false });
  let contentHtml = marked.parse(document.body);
  contentHtml = await inlineLocalImages(contentHtml, path.dirname(options.input));

  const eyebrow = options.eyebrow || `${options.brand} · SOLUTION BRIEF`;
  const html = buildHtml({
    css,
    contentHtml,
    title: document.title,
    subtitle: document.subtitle,
    eyebrow,
    date: options.date,
  });

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  if (options.keepHtml) {
    const keepHtml = path.resolve(options.keepHtml);
    fs.mkdirSync(path.dirname(keepHtml), { recursive: true });
    fs.writeFileSync(keepHtml, html, "utf8");
  }

  const executablePath = findBrowser(options, chromium);
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load", timeout: 120000 });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      }));
    });
    await page.emulateMedia({ media: "print" });
    const headerBrand = escapeHtml(`${options.brand} · AIGC SCALE PRODUCTION`);
    await page.pdf({
      path: options.output,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="width:100%;padding:0 16mm;text-align:right;font-family:'Noto Sans CJK SC','PingFang SC',Arial,sans-serif;font-size:7px;color:#3d4653;">${headerBrand}</div>`,
      footerTemplate: `<div style="width:100%;text-align:center;font-family:'Noto Sans CJK SC','PingFang SC',Arial,sans-serif;font-size:7px;color:#3d4653;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
      margin: { top: "16mm", right: "0", bottom: "15mm", left: "0" },
      tagged: true,
      outline: true,
    });
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({
    input: options.input,
    output: options.output,
    style: options.style,
    title: document.title,
    subtitle: document.subtitle,
    dateVisible: Boolean(options.date),
    legacyBrandReplaced: options.replaceLegacyBrand,
  }, null, 2));
}

main().catch((error) => fail(error.stack || error.message));
