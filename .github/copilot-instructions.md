# Copilot instructions for the Firefox (mozilla-central / firefox-main) repository

Trust these instructions. Only search the tree when something here is incomplete or proves wrong. Also read `AGENTS.md` at the repo root (and the `AGENTS.md`/`CLAUDE.md` inside `js/`, `gfx/wr/`, `layout/`, `security/nss/`, `browser/extensions/newtab/` when touching those). Task-specific guides live in `.agents/skills/<name>/SKILL.md` (frontend, commits, mozlint, fluent-migration, android, webidl/C++, etc.); read the relevant one before starting.

**This is a personal fork with a Device/OS spoofing feature and low-memory defaults.** Before touching it (or anything in `browser/modules/DeviceSpoofing*`, the Device spoofing settings pane, or fork prefs in `browser/app/profile/firefox.js`), read `.github/skills/device-spoofing/SKILL.md`. Never push to the `release` branch.

## What this repository is
Source of the Firefox web browser (Gecko engine, desktop front-end, GeckoView/Firefox for Android, SpiderMonkey JS engine). Very large (hundreds of thousands of files, several GB). Languages: C++ (engine), Rust (Stylo, WebRender, many components, `Cargo.toml` workspace at root), JavaScript/HTML/CSS (browser UI, `*.sys.mjs` modules, devtools), Python (build system `mach`, test harnesses), Kotlin/Java (`mobile/android`), WebIDL, IPDL, XPIDL, Fluent (`.ftl`) for localized strings. Build system: `./mach` + `moz.build` files + `moz.configure`.

**Never run unscoped `grep -r`/`find` at the repo root.** Restrict searches to a directory; prefer `rg`. If `searchfox-cli` is installed, use it for identifier search (`searchfox-cli --define 'Foo::Bar'`, `searchfox-cli --path 'dom/**' -q term`).

## Toolchain / versions
- Python >= 3.10 required by `./mach` (3.12 validated). Rust >= 1.90 (`python/mozboot/mozboot/util.py: MINIMUM_RUST_VERSION`) for full builds. Node is bootstrapped into `~/.mozbuild/node`.
- First `./mach` invocation creates `~/.mozbuild` and Python virtualenvs (~20 s). State lives in `~/.mozbuild`; build output in `obj-*/`.

## Bootstrap and build (validated)
1. Bootstrap (non-interactive). For front-end-only work (JS/HTML/CSS/FTL, tests) use artifact mode, which downloads prebuilt C++/Rust binaries:
   `./mach --no-interactive bootstrap --application-choice browser_artifact_mode`
   (~1 min after apt packages; installs system packages via `sudo apt` — it hangs on a password prompt if sudo is not passwordless.) It writes `./mozconfig` containing `ac_add_options --enable-artifact-builds`. Do not overwrite an existing `mozconfig`.
   For C++/Rust changes use `--application-choice browser` (full build, needs clang/rust toolchains; a full build takes tens of minutes to over an hour).
2. Build: `./mach build` (artifact build validated: ~3.5 min, mostly downloads; output in `obj-x86_64-pc-linux-gnu/`). After a first build, if only front-end files changed: `./mach build faster` (validated: ~7 s). If only C/C++/Rust changed: `./mach build binaries`. Front-end test files alone (tests, test manifests) need no rebuild.
3. Run: `./mach run` (add `--headless` where no display).
4. Always redirect output of slow commands to a file (e.g. `mkdir -p artifacts; ./mach build > artifacts/build.txt 2>&1`) and then read the file instead of re-running with `| tail`. `artifacts/` is git-ignored.
5. If a build fails after pulling/rebasing with odd configure or dependency errors, check whether `CLOBBER` changed; `./mach clobber` then rebuild.

## Testing
- `./mach test <path-to-test-or-dir>` auto-selects the harness (validated after an artifact build: `./mach test toolkit/modules/tests/xpcshell/test_Color.js` passes in ~20 s). Prefer `--headless` for browser tests.
- Specific harnesses: `./mach xpcshell-test <path>` (JS unit tests, `xpcshell.toml`), `./mach mochitest <path>` (browser-chrome `browser.toml`, plain/chrome `mochitest.toml`/`chrome.toml`), `./mach wpt <path>` (`testing/web-platform/tests`), `./mach gtest 'Suite.*'` (C++, needs full build), `./mach python-test <path>`, `./mach cargo test`/`./mach rusttests`, `./mach jstests`/`./mach jit-test` (SpiderMonkey).
- New tests must be listed in the directory's `*.toml` manifest, and that manifest must be referenced from `moz.build` (e.g. `XPCSHELL_TESTS_MANIFESTS`, `BROWSER_CHROME_MANIFESTS`, `MOCHITEST_MANIFESTS`). Test manifests are linted (`test-manifest-toml`): keep sections sorted.
- Browser/xpcshell/mochitest tests require a build (artifact build is sufficient for JS tests).

## Linting and formatting (run before finishing)
- `./mach lint <files-or-dirs>` (validated). `./mach lint` with no args lints modified files; `--outgoing` lints unpushed commits; `--fix` autofixes; `-l <linter>` selects one (e.g. `-l eslint`, `-l ruff`, `-l stylelint`, `-l clang-format`, `-l rustfmt`); `--list` lists linters. Linter configs: `tools/lint/*.yml`; ESLint `eslint.config.mjs` (+ `eslint-*.config.mjs`), Stylelint `.stylelintrc.js`, Prettier `.prettierrc.js`, Ruff `pyproject.toml`, clang-format `.clang-format`, `.yamllint`.
- First ESLint run installs root `node_modules` via `npm ci` automatically (~1.5 min); later runs are fast. Ruff runs in ~1 s. In an artifact-mode setup without Rust, `ERROR: problem with lint setup, skipping cargo-audit` (`No such file or directory: 'rustc'`) is harmless.
- `./mach format` formats all modified files (clang-format, rustfmt, prettier, ruff-format). Always run it on changed files.
- Do not run another command in the same terminal while a long `./mach` command is running: it gets interrupted (KeyboardInterrupt / "mach interrupted by signal").

## CI / pre-checkin validation
- CI is Taskcluster, not GitHub Actions (`.taskcluster.yml`, `taskcluster/kinds/*`; lint jobs in `taskcluster/kinds/source-test/mozlint.yml`). `.github/workflows/pr-handler.yml` only auto-closes PRs from non-members / retargets to `autoland`; never modify `.github/workflows` (requires Mozilla GitHub admin approval).
- Replicate CI locally with `./mach lint` on changed files, `./mach format`, the relevant `./mach test` paths, and a build. `./mach try ...` pushes to CI and needs credentials: do not push without user approval.
- Docs: `./mach doc --no-serve --no-open` (Sphinx; sources under `docs/` and per-component `docs/` dirs, indexed via `moz.build` `SPHINX_TREES`).

## Code conventions
- Commit message format: `Bug NNNNNN - Summary. r?reviewer` (never invent bug numbers; use `No bug - ` only if confirmed). See `.agents/skills/firefox-commits/SKILL.md`.
- Minimal comments; no emoji. C++ follows Google-ish Mozilla style enforced by clang-format; JS modules are `*.sys.mjs` loaded with `ChromeUtils.importESModule`/`ChromeUtils.defineESModuleGetters`.
- UI strings must be localized with Fluent (`.ftl` under `*/locales/en-US/`); changing an existing string's meaning requires a new ID.
- Front-end CSS: use design tokens from `toolkit/themes/shared/design-system`, logical properties, reusable widgets in `toolkit/content/widgets/`.
- Prefs: static prefs in `modules/libpref/init/StaticPrefList.yaml`; desktop defaults in `browser/app/profile/firefox.js`; shared defaults in `modules/libpref/init/all.js`.
- Third-party/vendored code (`third_party/`, `security/nss/`, `media/` libs, `gfx/skia`, `testing/web-platform/tests` upstream) is updated via `./mach vendor`; avoid hand edits.

## Layout (top level)
- `browser/` desktop Firefox UI: `base/content/` (main window, `browser.xhtml`), `components/` (features: urlbar, tabbrowser, preferences, newtab…), `themes/`, `locales/en-US/`, `app/profile/firefox.js`.
- `toolkit/` cross-app front-end and XPCOM components (`components/`, `content/widgets/`, `modules/`, `themes/`, `xre/` startup).
- `dom/` web APIs (WebIDL in `dom/webidl/`), `layout/` (layout/CSS boxes), `servo/` (Stylo CSS engine, Rust), `gfx/` (graphics, `gfx/wr` WebRender), `js/` (SpiderMonkey; `js/src`), `netwerk/` (networking), `ipc/` (IPDL/IPC), `xpcom/`, `widget/` (platform widgets), `image/`, `media/`, `editor/`, `docshell/`, `caps/` (security principals), `security/` (NSS, PSM, sandbox), `accessible/`, `intl/`, `modules/libpref/` (prefs), `storage/`, `parser/`, `uriloader/`, `mfbt/` (C++ utilities), `memory/`, `mozglue/`.
- `devtools/` (client = DevTools UI, server = actors), `remote/` (WebDriver BiDi/CDP, Marionette), `services/` (sync, settings).
- `mobile/android/` (GeckoView, Fenix, Focus, android-components; Gradle via root `build.gradle`/`settings.gradle`; see `.agents/skills/android`).
- `testing/` harnesses (mochitest, xpcshell, web-platform, talos, raptor, mozbase), `python/` (mach, mozbuild, mozboot), `build/` + `config/` (build system), `tools/` (lint, profiler, vcs), `taskcluster/` (CI), `third_party/` (vendored rust/python/js), `docs/` (source docs), `supply-chain/` (cargo-vet).
- Root config: `moz.build`, `moz.configure`, `configure.py`, `Cargo.toml`/`Cargo.lock`, `package.json`, `pyproject.toml`, `mozconfig` (local, generated by bootstrap), `mots.yaml` (module owners/reviewers), `CLOBBER`.
- Adding a source file requires listing it in the directory's `moz.build` (`UNIFIED_SOURCES`, `EXTRA_JS_MODULES`, `MOZ_SRC_FILES`, `jar.mn` for chrome content, etc.); otherwise it isn't built/packaged.
