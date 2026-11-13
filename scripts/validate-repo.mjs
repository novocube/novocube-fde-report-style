#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginName = "novocube-fde-report-style";
const styleName = "Novocube-fde-report-style";
const pluginRoot = path.join(root, "plugins", pluginName);

function fail(message) {
  console.error(`Validation failed: ${message}`);
  process.exit(1);
}

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing ${relativePath}`);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${relativePath}: ${error.message}`);
  }
}

function requireFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.statSync(fullPath, { throwIfNoEntry: false })?.isFile()) fail(`missing ${relativePath}`);
  return fullPath;
}

const marketplace = readJson(".agents/plugins/marketplace.json");
if (marketplace.name !== pluginName) fail("marketplace name must match the repository marketplace ID");
const entry = marketplace.plugins?.find((item) => item.name === pluginName);
if (!entry) fail("marketplace does not list the plugin");
if (entry.source?.path !== `./plugins/${pluginName}`) fail("marketplace source path is not portable");
if (!entry.policy?.installation || !entry.policy?.authentication || !entry.category) {
  fail("marketplace policy/category fields are incomplete");
}

const manifest = readJson(`plugins/${pluginName}/.codex-plugin/plugin.json`);
if (manifest.name !== pluginName) fail("plugin manifest name does not match its folder");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version || "")) {
  fail("plugin version is not valid semver");
}
if (manifest.skills !== "./skills/") fail("plugin skills path must be ./skills/");
if (manifest.license !== "UNLICENSED") fail("manifest license and repository policy differ");

const skillRoot = `plugins/${pluginName}/skills/${pluginName}`;
const skillMdPath = requireFile(`${skillRoot}/SKILL.md`);
const skillMd = fs.readFileSync(skillMdPath, "utf8");
if (!skillMd.startsWith("---\n") || !skillMd.includes(`\nname: ${pluginName}\n`)) {
  fail("SKILL.md frontmatter is invalid");
}
if (!skillMd.includes("\ndescription:")) fail("SKILL.md description is missing");
if (skillMd.includes("[TODO:")) fail("SKILL.md contains a TODO placeholder");

requireFile(`${skillRoot}/agents/openai.yaml`);
requireFile(`${skillRoot}/references/style-spec.md`);
const renderer = requireFile(`${skillRoot}/scripts/md_to_pdf.mjs`);
const rendererSource = fs.readFileSync(renderer, "utf8");
if (!rendererSource.includes("FDE REPORT")) fail("renderer header label is not brand-specific");
if (/AIGC SCALE PRODUCTION|AGIC/i.test(rendererSource)) fail("renderer contains a forbidden header label");
if (!rendererSource.includes("--include-source-date")) fail("optional source date mode is missing");
const styleRoot = `${skillRoot}/assets/${styleName}`;
const style = readJson(`${styleRoot}/style.json`);
if (style.id !== styleName || style.default !== true) fail("default style identity is invalid");
if (style.page?.dateMode !== "optional" || style.page?.showDate !== false) {
  fail("default date mode must be hidden but optional");
}
requireFile(`${styleRoot}/style.css`);
const reference = requireFile(`${styleRoot}/reference.pdf`);
if (!fs.readFileSync(reference).subarray(0, 5).equals(Buffer.from("%PDF-"))) {
  fail("reference.pdf is not a PDF file");
}
requireFile(`${styleRoot}/fonts/NotoSansCJKsc-Regular.otf`);
requireFile(`${styleRoot}/fonts/NotoSansCJKsc-Bold.otf`);
const fontLicense = fs.readFileSync(requireFile(`${styleRoot}/fonts/OFL.txt`), "utf8");
if (!fontLicense.includes("SIL OPEN FONT LICENSE Version 1.1")) fail("font license is missing or invalid");

const syntax = spawnSync(process.execPath, ["--check", renderer], { encoding: "utf8" });
if (syntax.status !== 0) fail(`renderer syntax error: ${syntax.stderr.trim()}`);

console.log(`Validation passed: ${pluginName}@${manifest.version}`);
console.log(`Default style: ${styleName}`);
