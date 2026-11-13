#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
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

const repositoryPackage = readJson("package.json");
if (repositoryPackage.version !== manifest.version) fail("repository and plugin versions differ");
if (repositoryPackage.scripts?.["install:dsh"] !== "node scripts/install-dsh.mjs") {
  fail("DSH installer script is not exposed through npm");
}
if (repositoryPackage.dsh?.bundle?.patch !== "./cordis.patch.yml") {
  fail("root package does not declare dsh.bundle.patch");
}
if (!repositoryPackage.keywords?.includes("dsh-plugin")) fail("root package is missing the dsh-plugin keyword");
const packageFiles = new Set(repositoryPackage.files || []);
for (const required of [
  "cordis.patch.yml",
  ".agents/plugins/marketplace.json",
  `.dsh/skills/${pluginName}/SKILL.md`,
  `plugins/${pluginName}/`,
  "scripts/",
]) {
  if (!packageFiles.has(required)) fail(`npm package files do not include ${required}`);
}

const dshPatchPath = requireFile("cordis.patch.yml");
const dshPatch = fs.readFileSync(dshPatchPath, "utf8");
for (const fragment of [
  "- insert:",
  `id: ${pluginName}-skill-provider`,
  "name: '@deepseek-ai/dsh-skill-filesystem'",
  `providerName: ${pluginName}`,
  "includeDefaultRoots: false",
  "watch: false",
  "bundledSkillDir: !!js",
  `resolve('${repositoryPackage.name}/package.json')`,
  `'plugins', '${pluginName}', 'skills'`,
]) {
  if (!dshPatch.includes(fragment)) fail(`DSH bundle patch is missing: ${fragment}`);
}

const skillRoot = `plugins/${pluginName}/skills/${pluginName}`;
const skillMdPath = requireFile(`${skillRoot}/SKILL.md`);
const skillMd = fs.readFileSync(skillMdPath, "utf8");
if (!skillMd.startsWith("---\n") || !skillMd.includes(`\nname: ${pluginName}\n`)) {
  fail("SKILL.md frontmatter is invalid");
}
if (!skillMd.includes("\ndescription:")) fail("SKILL.md description is missing");
if (skillMd.includes("[TODO:")) fail("SKILL.md contains a TODO placeholder");
if (!/DeepSeek Harness|\bDSH\b/.test(skillMd)) fail("canonical skill does not declare DSH support");
if (/\/Users\//.test(skillMd)) fail("SKILL.md contains a user-specific absolute path");

const skillPackage = readJson(`${skillRoot}/package.json`);
if (skillPackage.version !== manifest.version) fail("skill runtime and plugin versions differ");
if (!skillPackage.dependencies?.marked || !skillPackage.dependencies?.playwright) {
  fail("skill runtime dependencies are incomplete");
}

requireFile(`${skillRoot}/agents/openai.yaml`);
requireFile(`${skillRoot}/references/style-spec.md`);
const renderer = requireFile(`${skillRoot}/scripts/md_to_pdf.mjs`);
const rendererSource = fs.readFileSync(renderer, "utf8");
if (!rendererSource.includes("FDE REPORT")) fail("renderer header label is not brand-specific");
if (/AIGC SCALE PRODUCTION|AGIC/i.test(rendererSource)) fail("renderer contains a forbidden header label");
if (!rendererSource.includes("--include-source-date")) fail("optional source date mode is missing");
if (!rendererSource.includes("installedSkillRoot, \"node_modules\"")) {
  fail("renderer does not search DSH skill-local dependencies");
}
if (!rendererSource.includes('data:font/otf;base64,${boldData}')) {
  fail("page fonts are not embedded independently of browser file-access policy");
}
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

const dshSkillPath = requireFile(`.dsh/skills/${pluginName}/SKILL.md`);
const dshSkill = fs.readFileSync(dshSkillPath, "utf8");
if (!dshSkill.startsWith("---\n") || !dshSkill.includes(`\nname: ${pluginName}\n`)) {
  fail("DSH project skill frontmatter is invalid");
}
if (!dshSkill.includes(`plugins/${pluginName}/skills/${pluginName}/`)) {
  fail("DSH project skill does not route to the canonical skill");
}

const dshInstaller = requireFile("scripts/install-dsh.mjs");
const installerSyntax = spawnSync(process.execPath, ["--check", dshInstaller], { encoding: "utf8" });
if (installerSyntax.status !== 0) fail(`DSH installer syntax error: ${installerSyntax.stderr.trim()}`);
const installerHelp = spawnSync(process.execPath, [dshInstaller, "--help"], { encoding: "utf8" });
if (installerHelp.status !== 0 || !installerHelp.stdout.includes("DeepSeek Harness")) {
  fail("DSH installer help is unavailable");
}

const installTestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "novocube-dsh-install-"));
const installTestTarget = path.join(installTestRoot, pluginName);
try {
  const installTest = spawnSync(process.execPath, [dshInstaller, "--target", installTestTarget, "--skip-deps", "--skip-browser"], {
    encoding: "utf8",
  });
  if (installTest.status !== 0) fail(`DSH installer smoke test failed: ${installTest.stderr.trim()}`);
  if (!fs.statSync(path.join(installTestTarget, "SKILL.md"), { throwIfNoEntry: false })?.isFile()) {
    fail("DSH installer did not copy the canonical skill");
  }
  if (!fs.statSync(path.join(installTestTarget, "assets", styleName, "fonts", "NotoSansCJKsc-Regular.otf"), { throwIfNoEntry: false })?.isFile()) {
    fail("DSH installer did not copy bundled fonts");
  }
  if (fs.existsSync(path.join(installTestTarget, "node_modules"))) {
    fail("DSH --skip-deps smoke test unexpectedly copied node_modules");
  }
  const overwriteRefusal = spawnSync(process.execPath, [dshInstaller, "--target", installTestTarget, "--skip-deps"], {
    encoding: "utf8",
  });
  if (overwriteRefusal.status === 0 || !overwriteRefusal.stderr.includes("--force")) {
    fail("DSH installer does not safely refuse an existing target");
  }
  const unsafeTarget = spawnSync(process.execPath, [dshInstaller, "--target", path.join(root, skillRoot), "--force", "--skip-deps"], {
    encoding: "utf8",
  });
  if (unsafeTarget.status === 0 || !unsafeTarget.stderr.includes("unsafe target")) {
    fail("DSH installer does not reject a source-overlapping target");
  }
  if (!fs.statSync(skillMdPath, { throwIfNoEntry: false })?.isFile()) {
    fail("DSH unsafe-target check damaged the canonical skill");
  }
} finally {
  fs.rmSync(installTestRoot, { recursive: true, force: true });
}

console.log(`Validation passed: ${pluginName}@${manifest.version}`);
console.log(`Default style: ${styleName}`);
console.log("Hosts: Codex, DeepSeek Harness (DSH)");
