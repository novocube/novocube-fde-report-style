#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillName = "novocube-fde-report-style";
const source = path.join(repoRoot, "plugins", skillName, "skills", skillName);

function fail(message, code = 1) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function help() {
  console.log(`Usage: node scripts/install-dsh.mjs [options]

Install the Novocube FDE report skill for DeepSeek Harness (DSH).

Options:
  --target PATH   Install into an explicit skill directory
  --project PATH  Install into PATH/.dsh/skills/${skillName}
  --force         Replace an existing installation
  --skip-deps     Do not run npm install in the installed skill
  --skip-browser  Do not install Chromium when no system browser is found
  --help          Show this help

Default target: \${DSH_HOME:-~/.dsh}/skills/${skillName}`);
}

function parseArgs(argv) {
  const options = { target: null, project: null, force: false, skipDeps: false, skipBrowser: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      help();
      process.exit(0);
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "--skip-deps") {
      options.skipDeps = true;
      continue;
    }
    if (arg === "--skip-browser") {
      options.skipBrowser = true;
      continue;
    }
    if (arg === "--target" || arg === "--project") {
      if (index + 1 >= argv.length) fail(`${arg} requires a path`, 2);
      options[arg.slice(2)] = argv[++index];
      continue;
    }
    fail(`unknown option: ${arg}`, 2);
  }
  if (options.target && options.project) fail("use either --target or --project, not both", 2);
  return options;
}

function resolveTarget(options) {
  if (options.target) return path.resolve(options.target);
  if (options.project) return path.join(path.resolve(options.project), ".dsh", "skills", skillName);
  const dshHome = process.env.DSH_HOME ? path.resolve(process.env.DSH_HOME) : path.join(os.homedir(), ".dsh");
  return path.join(dshHome, "skills", skillName);
}

const options = parseArgs(process.argv.slice(2));
const target = resolveTarget(options);
if (!fs.statSync(source, { throwIfNoEntry: false })?.isDirectory()) fail(`source skill not found: ${source}`);

function isWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

if (isWithin(target, source) || isWithin(source, target)) {
  fail(`unsafe target overlaps the canonical source: ${target}`);
}

if (fs.existsSync(target)) {
  if (!options.force) fail(`target already exists: ${target}; pass --force to replace it`);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
const staging = `${target}.installing-${process.pid}-${Date.now()}`;

function findSystemBrowser() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

try {
  fs.cpSync(source, staging, {
    recursive: true,
    errorOnExist: true,
    filter: (entry) => !entry.split(path.sep).includes("node_modules"),
  });

  if (!options.skipDeps) {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    const install = spawnSync(npmCommand, ["install", "--omit=dev", "--no-audit", "--no-fund"], {
      cwd: staging,
      encoding: "utf8",
      stdio: "inherit",
    });
    if (install.error) throw new Error(`could not start npm: ${install.error.message}`);
    if (install.status !== 0) throw new Error(`npm install failed with exit code ${install.status}`);

    if (!options.skipBrowser && !findSystemBrowser()) {
      const playwright = path.join(staging, "node_modules", ".bin", process.platform === "win32" ? "playwright.cmd" : "playwright");
      const browserInstall = spawnSync(playwright, ["install", "chromium"], {
        cwd: staging,
        encoding: "utf8",
        stdio: "inherit",
      });
      if (browserInstall.error) throw new Error(`could not start Playwright browser installer: ${browserInstall.error.message}`);
      if (browserInstall.status !== 0) throw new Error(`Chromium install failed with exit code ${browserInstall.status}`);
    }
  }

  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  fs.renameSync(staging, target);
} catch (error) {
  fs.rmSync(staging, { recursive: true, force: true });
  fail(error.message);
}

console.log(`Installed DSH skill: ${target}`);
console.log(`Verify in DSH with /skills, then invoke /${skillName}.`);
