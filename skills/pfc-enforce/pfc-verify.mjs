#!/usr/bin/env node
// PFC boundary check. Zero dependencies, Node >= 18.
//
// Copy into a project as scripts/pfc-verify.mjs and run it before the build:
//   "verify": "node scripts/pfc-verify.mjs"
//
// Derived material: it automates the import rules in docs/dependency-rules.md of
// https://github.com/irekBudzowski/PFC_Page-Feature-Composition and adds none.
// It reads import specifiers with regular expressions, not a parser, so it is a
// fast tripwire, not a type checker. Exit code 1 means a boundary is broken.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// Edit this block to match the project. Every path is relative to the project root.
const CONFIG = {
  srcDir: "src",                  // where to scan
  featuresDir: "src/features",    // Angular: "src/app/features"; SvelteKit: "src/lib/features"
  pagesDirs: ["src/pages"],       // Next.js: ["src/app"]; SvelteKit: ["src/routes"]
  sharedDir: "src/shared",
  coreDir: "src/core",
  // Import aliases: prefix -> the folder it points at (match tsconfig "paths").
  aliases: { "@/": "src/", "~/": "src/", "$lib/": "src/lib/", "@app/": "src/app/" },
  extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".vue", ".svelte"],
  skipDirs: ["node_modules", "dist", "build", ".next", ".nuxt", ".svelte-kit", "coverage", ".git"],
  // Rule 4 (heuristic): folders inside a feature that a dumb component must not import.
  privateDirs: ["services", "store", "api"],
};

const ROOT = process.cwd();
const posix = (p) => p.replaceAll("\\", "/");
const rel = (abs) => posix(relative(ROOT, abs));
const under = (path, dir) => path === dir || path.startsWith(`${dir}/`);
const violations = [];

// Which PFC layer does a project-relative path belong to?
function classify(path) {
  if (under(path, CONFIG.featuresDir)) {
    const [name = "", ...rest] = path.slice(CONFIG.featuresDir.length + 1).split("/");
    return { layer: "feature", name, inner: rest.join("/") };
  }
  if (CONFIG.pagesDirs.some((dir) => under(path, dir))) return { layer: "page" };
  if (under(path, CONFIG.sharedDir)) return { layer: "shared" };
  if (under(path, CONFIG.coreDir)) return { layer: "core" };
  return null;
}

// Turn an import specifier into a project-relative path, or null for packages.
function resolveSpec(fromFile, spec) {
  if (spec.startsWith(".")) return rel(resolve(dirname(fromFile), spec));
  for (const [prefix, target] of Object.entries(CONFIG.aliases)) {
    if (spec.startsWith(prefix)) return posix(join(target, spec.slice(prefix.length)));
  }
  return null;
}

// Every module specifier in a file, with its line number. Covers `import x from`,
// `export ... from`, side-effect `import "x"`, dynamic `import("x")` and `require("x")`.
// Whole-line comments are blanked first so commented-out imports do not count.
function importsOf(source) {
  const text = source
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*\/\*[\s\S]*?\*\//gm, (m) => m.replace(/[^\n]/g, ""));
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"'\n]+)["']/g;
  return [...text.matchAll(pattern)].map((m) => ({
    spec: m[1],
    line: text.slice(0, m.index).split("\n").length,
  }));
}

// A barrel import names the feature folder itself or its index file.
const isBarrel = (inner) => inner === "" || /^index(\.[cm]?[jt]sx?)?$/.test(inner);

function report(file, line, spec, rule, fix) {
  violations.push(`${file}:${line}  "${spec}"\n      rule: ${rule}\n      fix:  ${fix}`);
}

function check(abs) {
  const file = rel(abs);
  const from = classify(file);
  if (!from) return;
  for (const { spec, line } of importsOf(readFileSync(abs, "utf8"))) {
    const target = resolveSpec(abs, spec);
    const to = target && classify(target);
    if (!to) continue;

    // 1. A feature never imports another feature (or a page).
    if (from.layer === "feature" && to.layer === "feature" && to.name !== from.name) {
      report(file, line, spec, `feature "${from.name}" imports feature "${to.name}"; features never import features`,
        "delete the import and let the page carry the value: the other feature emits it, the page holds it, the page passes it into this one as an input. If the two cannot live apart, they are one feature.");
    }
    if (from.layer === "feature" && to.layer === "page") {
      report(file, line, spec, `feature "${from.name}" imports a page; a feature depends on shared/ and core/ only`,
        "emit an output and let the page react to it.");
    }

    // 2. A page touches a feature only through its barrel.
    if (from.layer === "page" && to.layer === "feature" && !isBarrel(to.inner)) {
      const barrel = spec.endsWith(`/${to.inner}`) ? spec.slice(0, -to.inner.length - 1) : `${CONFIG.featuresDir}/${to.name}`;
      report(file, line, spec, `page reaches into feature "${to.name}" internals (${to.inner})`,
        `import from the barrel "${barrel}". If the page needs something the barrel does not export, widen the public facade deliberately.`);
    }

    // 3. shared/ and core/ never depend on a feature or a page.
    if ((from.layer === "shared" || from.layer === "core") && (to.layer === "feature" || to.layer === "page")) {
      const what = to.layer === "feature" ? `feature "${to.name}"` : "a page";
      report(file, line, spec, `${from.layer}/ imports ${what}; shared/ and core/ never depend on features or pages`,
        "invert the dependency: the caller passes the value in as an argument or input. If the imported code is genuinely generic, move it out of the feature into shared/.");
    }

    // 4. Heuristic: a dumb component does not reach for services, store or the facade.
    if (from.layer === "feature" && from.inner.startsWith("components/") && to.layer === "feature" && to.name === from.name) {
      const [top] = to.inner.split("/");
      const base = to.inner.split("/").pop();
      if (CONFIG.privateDirs.includes(top) || /\.facade(\.|$)/.test(base)) {
        report(file, line, spec, `component imports "${to.inner}"; a component that reaches for data is a container (heuristic check)`,
          "move the call into the feature's container and pass the result down as an input, or move this file to containers/.");
      }
    }
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (CONFIG.skipDirs.includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (CONFIG.extensions.some((ext) => path.endsWith(ext))) check(path);
  }
}

walk(resolve(ROOT, CONFIG.srcDir));

if (violations.length > 0) {
  console.error("PFC boundary violations:\n");
  for (const v of violations) console.error(`  x ${v}\n`);
  console.error(`${violations.length} violation(s). The rules: docs/dependency-rules.md in the PFC repository.`);
  process.exit(1);
}
console.log("PFC boundaries: clean");
