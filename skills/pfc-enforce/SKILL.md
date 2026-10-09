---
name: pfc-enforce
description: Set up a mechanical check that fails the build when a Page-Feature Composition boundary is broken — a feature importing another feature, a page reaching past a feature's barrel, shared/ or core/ importing a feature or page, a dumb component reaching for data. Picks Nx module boundaries, eslint-plugin-boundaries, or a zero-dependency Node script, wires it into the build or CI, and proves it fails on a deliberate violation. Use when setting up PFC in a project, adding CI or build checks for feature boundaries, or when boundary violations keep slipping through review. Any framework. Only runs when explicitly invoked, because it edits build configuration.
disable-model-invocation: true
---

# Enforcing PFC boundaries in the build

> **Note on provenance.** This skill is **derived material**, not part of the
> original series. The series says the import rules should be enforced by
> tooling in CI (`docs/dependency-rules.md`, "Enforcing it"). This skill
> automates exactly those rules and **adds none**. Where a mechanism cannot
> express a rule exactly, it says so rather than inventing a stricter one.

An agent responds reliably to a failing build and much less reliably to prose.
The goal here is one command that exits non-zero, with a message that says what
to fix, every time a boundary breaks.

## First, establish whether PFC applies

If the project is a landing page, a marketing site, a prototype, or an app under
10 routes, PFC does not apply and there is nothing to enforce. Say so and stop.
If the project has no `features/` folder yet, set up the structure first with
the `pfc` skill; a check over folders that do not exist proves nothing.

## Step 1 — Read the layout

Answer these from the code, not by asking:

- Where `features/`, `shared/` and `core/` live (`src/`, `src/app/` in Angular,
  `src/lib/` in SvelteKit).
- Where pages live: `pages/`, `routes/`, or `app/` in the Next.js App Router.
- The import aliases, from `tsconfig.json` `paths`, `vite.config` `resolve.alias`
  or the framework's defaults: `@/features/x`, `~/features/x`, `$lib/features/x`,
  or plain relative paths.
- What already runs before or in the build: `package.json` scripts, `nx.json`,
  an existing ESLint config, CI workflow files.

Ask only what the code cannot answer.

## Step 2 — Pick the mechanism

Take the first that fits. Do not add a second linter to a project to get the
first option.

### a. The project is already on Nx — `@nx/enforce-module-boundaries`

Tag each library in its `project.json` (`"tags": ["type:feature"]`, and so on),
then constrain the tags. This is exactly the dependency table:

```js
// eslint.config.js (or .mjs)
import nx from "@nx/eslint-plugin";

export default [
  ...nx.configs["flat/base"],
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@nx/enforce-module-boundaries": ["error", {
        depConstraints: [
          { sourceTag: "type:page", onlyDependOnLibsWithTags: ["type:feature", "type:shared", "type:core"] },
          { sourceTag: "type:feature", onlyDependOnLibsWithTags: ["type:shared", "type:core"] },
          { sourceTag: "type:shared", onlyDependOnLibsWithTags: ["type:shared", "type:core"] },
          { sourceTag: "type:core", onlyDependOnLibsWithTags: ["type:core", "type:shared"] },
        ],
      }],
    },
  },
];
```

**Trade-off.** Nx sees projects, not folders. It only works when **each feature
is its own library**; two features inside one library can import each other
freely. Barrel-only access comes from the library's path mapping exposing only
its `index.ts`, plus the rule's ban on relative imports across libraries. It has
no notion of a dumb component, so add the component check from option b's
`no-restricted-imports` block, with `files` pointed at the libraries'
`components/` folders.

### b. The project already runs ESLint — `eslint-plugin-boundaries`

Written for `eslint-plugin-boundaries` v7 (the `boundaries/dependencies` rule,
entity selectors and `boundaries/files`; the older `element-types` and
`entry-point` rules are deprecated). On v5 or v6, upgrade first; v7 keeps v6
configs working. TypeScript aliases need `eslint-import-resolver-typescript`.
Merge this block into the existing flat config, adjusting the paths from step 1:

```js
// eslint.config.js (or .mjs)
import boundaries from "eslint-plugin-boundaries";

export default [
  // ...the project's existing config, including its TypeScript parser
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      // One element per feature folder; shared/ and core/ are one element each.
      "boundaries/elements": [
        { type: "feature", pattern: "src/features/*", capture: ["featureName"] },
        { type: "page", pattern: "src/pages/*" },
        { type: "shared", pattern: "src/shared" },
        { type: "core", pattern: "src/core" },
      ],
      // Used only by the component heuristic, the last policy below.
      "boundaries/files": [
        { category: "component", pattern: "src/features/*/components/**" },
        { category: "data-access", pattern: ["src/features/*/{services,store,api}/**", "src/features/*/*.facade.*"] },
      ],
    },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "disallow",
        checkInternals: true, // so the component heuristic sees imports inside one feature
        message: "{{from.element.types.[0]}} may not import {{to.element.types.[0]}} ({{dependency.source}}). See the PFC dependency rules.",
        // The last matching policy wins, so order matters.
        policies: [
          // Page: a feature's barrel, shared/ and core/.
          {
            from: { element: { type: "page" } },
            disallow: { to: { element: { type: "feature" } } },
            message: "Page reaches into a feature's internals ({{dependency.source}}). Import from the feature's barrel; if the page needs more, widen the public facade deliberately.",
          },
          {
            from: { element: { type: "page" } },
            allow: { to: { element: { type: "feature", fileInternalPath: "index.{ts,tsx,js,jsx}" } } },
          },
          {
            from: { element: { type: "page" } },
            allow: { to: { element: { types: ["shared", "core"] } } },
          },
          // Feature: shared/ and core/. Never another feature, never a page.
          {
            from: { element: { type: "feature" } },
            disallow: { to: { element: { types: ["feature", "page"] } } },
            message: "Feature {{from.element.captured.featureName}} imports {{dependency.source}}. Features never import features: the page carries the value (one feature emits, the page holds it, the page passes it in as an input).",
          },
          {
            from: { element: { type: "feature" } },
            allow: { to: { element: { types: ["shared", "core"] } } },
          },
          // shared/ and core/ may use each other; they never import a feature or a page.
          {
            from: { element: { types: ["shared", "core"] } },
            allow: { to: { element: { types: ["shared", "core"] } } },
          },
          {
            from: { element: { types: ["shared", "core"] } },
            disallow: { to: { element: { types: ["feature", "page"] } } },
            message: "{{from.element.types.[0]}}/ imports {{dependency.source}} from a feature or page. Invert the dependency: the caller passes the value in.",
          },
          // A file may import files of its own element. This re-allows imports inside one feature.
          { allow: { dependency: { relationship: { to: "internal" } } } },
          // Heuristic: a dumb component does not reach for services, store or the facade.
          {
            from: { file: { categories: "component" } },
            disallow: { to: { file: { categories: "data-access" } } },
            message: "Component imports {{dependency.source}}. A component that reaches for data is a container: move the call into the container and pass the result down, or move this file to containers/.",
          },
        ],
      }],
    },
  },
];
```

Packages and framework imports are not checked by this rule by default, so they
need no policy.

**Trade-off.** Best editor feedback and exact resolution through the project's
own resolver, at the cost of a dependency and a config that has to be kept in
step with the folder layout. Vue and Svelte files need the project's
`vue-eslint-parser` or `svelte-eslint-parser` to be in place first.

Without `eslint-plugin-boundaries`, the component heuristic alone is a core
ESLint rule and works anywhere:

```js
{
  files: ["src/features/*/components/**/*.{ts,tsx,js,jsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["**/services/**", "**/store/**", "**/api/**", "**/*.facade", "**/*.facade.*"],
        message: "A component that reaches for data is a container. Move the call into the container and pass the result down, or move this file to containers/.",
      }],
    }],
  },
},
```

### c. Anything else, or no lint setup — the zero-dependency script

Copy `pfc-verify.mjs` from this skill's folder into the project as
`scripts/pfc-verify.mjs`, edit the `CONFIG` block at its top to the layout from
step 1, and run it before the build:

```json
{
  "scripts": {
    "verify": "node scripts/pfc-verify.mjs",
    "build": "npm run verify && <the existing build command>"
  }
}
```

**Trade-off.** No dependency, any framework, `.vue` and `.svelte` included, and
readable in one sitting. It reads import specifiers with regular expressions
rather than a parser and resolves only relative paths and the aliases listed in
`CONFIG`, so it is a fast tripwire, not a type checker. Node 18 or newer.

## Step 3 — What every mechanism must catch

| Check | Rule in `docs/dependency-rules.md` |
|---|---|
| 1. A feature imports another feature (or a page) | Feature may depend on `shared/` and `core/`; never another feature |
| 2. A page imports anything from a feature other than its barrel | Page may depend on a feature's module and public facade only |
| 3. `shared/` or `core/` imports a feature or a page | Neither shared nor core may depend on features or pages |
| 4. A file in a feature's `components/` imports from that feature's `services/`, `store/`, `api/` or facade | A component that injects a service is not a component |

Check 4 is a **heuristic**. A component can still reach for data through a
framework call that never appears as an import of those folders, and a folder
named `api/` may hold only types. Treat a hit as a strong signal, and when it is
a false positive, rename or move the file rather than silencing the check.

The checks enforce the table's "must never depend on" column. Imports between
`shared/` and `core/` pass: a core layout using a shared button is ordinary.
If the team wants `shared/` to be a strict bottom layer, tighten that
deliberately and say so; do not invent it as a PFC rule.

## Step 4 — Wire it so the build fails

An editor squiggle is not enforcement. The check must run in the command that
gates a merge or a deploy: `build`, or a required CI step. For ESLint and Nx,
make sure `lint` runs in CI and fails the job on errors; if it only runs in the
editor today, add it. For the script, chain it before the build as shown.

## Step 5 — Prove it

1. Run the check on the current code. If it already fails, those are real
   violations: report them, do not hide them, and agree with the person whether
   to fix them now or in a migration pass (`pfc-migrate`).
2. Add a deliberate violation in a scratch file — for example a file in one
   feature's `containers/` importing another feature's barrel.
3. Run the build or the check and show it failing with the message.
4. **Delete the scratch file** and show the check passing.

Never leave the deliberate violation behind, and never commit it.

## Step 6 — The message is the fix

Agents and people fix what the message tells them. Every failure must name:

- **the file** (and line, where the tool gives one),
- **the rule broken**, in the words of the dependency table,
- **the fix**: the page carries the value between features; import the
  feature's barrel; move the logic into the container.

A bare "boundary violation" sends the reader back to the docs. The messages in
the configurations and the script above already carry the fix; keep them when
adapting.

## Do not

- Add rules that are not in `docs/dependency-rules.md`. Naming conventions,
  folder-depth limits and the like are not PFC.
- Enforce the ~50-line page guideline as a hard failure. It is a guideline that
  says something has been absorbed; at most report it as a warning.
- Exempt files with ignore comments, or widen the allowed list, to get a green
  build. A violation that needs to stay while a migration is in progress is
  recorded and named in the report, not silenced.
- Leave the check running only in the editor.

## Report at the end

The mechanism chosen and why the others were passed over; where it runs (the
script or CI job that now fails); the proof, with the failing output on the
deliberate violation and the passing output after removing it; and any existing
violations it found, file by file.
