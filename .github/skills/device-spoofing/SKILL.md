---
name: device-spoofing
description: Use this skill when working on the Device/OS spoofing feature of this fork (Settings > Device spoofing, browser.deviceSpoofing.* prefs, DeviceSpoofing.sys.mjs), its test page, or the fork's low-memory/privacy pref defaults.
---

# Device / OS spoofing fork

Knowledge collected while building the feature. Read this before changing
anything under `browser/modules/DeviceSpoofing*`, the Device spoofing settings
pane, or the fork-specific prefs in `browser/app/profile/firefox.js`.

## Repository and workflow

- Personal fork `git@github.com:MarkBremer/firefox.git` (only remote, no Mozilla
  remote). Work branch: `device-spoofing-158.0.1`, based on Firefox 158.0.1
  release commit `1a0cfe22a2d8`. `release` must stay identical to upstream;
  never commit or push to it. Ask before any push.
- The user documents every patch in the "Patches in this fork" section of the
  root `README.md`. Update it when adding or changing a patch.
- Every new option must appear in the settings pane AND have a commented
  default in `browser/app/profile/firefox.js` (block "Device/OS spoofing").
- Environment: WSL2, Ubuntu, no `rg` (use `grep -rn` on narrow paths), no GPU
  (Mesa software rendering; `libEGL`/`ZINK` warnings are harmless). Windows
  fonts exist at `/mnt/c/Windows/Fonts` but are not visible to Linux apps.
- Artifact build (`mozconfig` has `--enable-artifact-builds`): only JS, CSS,
  FTL, prefs and manifests can change. C++/Rust changes are not compiled, so
  everything is done with prefs, chrome JS, JS window actors and style sheets.

## Build, run, test

```sh
./mach build > artifacts/build.txt 2>&1        # after moz.build, jar.mn, *.manifest changes
./mach build faster > artifacts/faster.txt 2>&1 # after JS/CSS/FTL/pref changes
./mach run --purgecaches about:preferences#deviceSpoofing
./mach test browser/components/preferences/tests/browser_device_spoofing_pane.js --headless > artifacts/t.txt 2>&1
./mach lint <files>; ./mach format <files>
```

- Always use `--purgecaches` after rebuilding: the test profile
  (`obj-x86_64-pc-linux-gnu/tmp/profile-default`) otherwise serves stale cached
  modules (symptom: `PreferenceNotAddedError` or old behavior).
- A running Firefox keeps old code; close it before testing changes.
- Lint warnings about `cargo-audit`/`rustc` and "firefox.js ignored" are harmless.
- The browser test runs in `browser-srd.toml` (settings redesign enabled).
  `EXPECTED-FAIL changed preference` lines are fine.

### Test page (OS score + lie detection)

`windows-test.html` in this folder scores how "Windows" the browser looks
(user agent, WebGL, fonts, system fonts, scrollbars, input, screen, speech)
and runs consistency checks (declared values agree, screen vs CSS device size,
window fits screen, toolbars have height, DPR vs CSS resolution, patched
built-ins look native, `document.hidden` vs animation frames, Worker and iframe
values equal the page). `run_wt.py` starts a fresh Firefox via Marionette with
given prefs and prints all three result tables:

```sh
./mach python .github/skills/device-spoofing/run_wt.py windows
./mach python .github/skills/device-spoofing/run_wt.py windows gpu=nvidia-rtx-3060-ti screen.resolution=custom screen.customResolution=1680x1050
./mach python .github/skills/device-spoofing/run_wt.py ""   # spoofing off, expect 0%
```

Pref names are relative to `browser.deviceSpoofing.`; prefix with `/` for an
absolute pref name. Last results: Windows 100%, consistency 97%.

## Architecture

| File | Role |
|---|---|
| `browser/modules/DeviceSpoofing.sys.mjs` | `PRESETS` (windows, macos, linux, android), `GPUS`, `CATEGORIES`, `apply()`; started via `browser/components/BrowserComponents.manifest` (`browser-before-ui-startup`) and re-run by a pref observer on `browser.deviceSpoofing.` |
| `browser/modules/DeviceSpoofingChild.sys.mjs` | JS window actor child, per-document patches (WebGL limits, foreground) |
| `browser/modules/moz.build` | `MOZ_SRC_FILES` for both modules (`moz-src:///browser/modules/...`) |
| `browser/components/preferences/config/device-spoofing.mjs` | Settings pane (setting-group config) |
| `browser/components/preferences/preferences.js` | `CONFIG_PANES.deviceSpoofing` (groupIds) |
| `browser/components/preferences/preferences.xhtml`, `jar.mn` | Nav button, packaging |
| `browser/locales/en-US/browser/preferences/preferences.ftl` | Strings, section "Device and OS spoofing page" |
| `browser/components/preferences/tests/browser_device_spoofing_pane.js` | Browser test |

`apply()` flow: read preset; for each enabled category call
`build(preset, version, presetName)` which returns `{prefs, targets, sheet,
webglPatch, screen}`; clear prefs written last time but no longer wanted
(tracked in `browser.deviceSpoofing.applied`, JSON); set new prefs; add/remove
`+Target` tokens in both fingerprinting-protection override prefs; register the
font style sheet; register/unregister the actor; apply screen overrides to all
tabs. The "foreground" option is independent of the preset.

### Adding a new spoofed signal

1. Find a pref or chrome API that controls it (search `StaticPrefList.yaml`,
   `RFPTargets.inc`, `dom/chrome-webidl/BrowsingContext.webidl`).
2. Add a category function in `CATEGORIES` (or per-preset values in `PRESETS`).
3. Add `pref("browser.deviceSpoofing.<category>", ...)` with a comment in
   `firefox.js`; add the setting to `CATEGORY_SETTINGS` and the group in
   `device-spoofing.mjs`; add FTL strings.
4. Add a check to `windows-test.html` and an assertion to the browser test.
5. Update `README.md`.

## Gecko facts learned (keep in mind)

- `general.{useragent,platform,oscpu,appversion}.override` apply to pages,
  workers and the HTTP header, but NOT to system-principal callers. In tests,
  `SpecialPowers.spawn` code is privileged: evaluate as the page with
  `content.wrappedJSObject.eval(...)`.
- Resist Fingerprinting (`privacy.resistFingerprinting`) beats all overrides
  and reports the real OS family; the pane shows a warning.
- Extra protections are enabled with `+Target` tokens in
  `privacy.fingerprintingProtection.overrides` (FPP, private windows) and
  `privacy.baselineFingerprintingProtection.overrides` (baseline, on by default).
  Targets: `toolkit/components/resistfingerprinting/RFPTargets.inc`.
  `WindowOuterSize` was removed on purpose: outer == inner size is itself a tell.
- CPU: Firefox freezes the architecture in UA/platform/oscpu (Linux always
  `x86_64`, macOS always Intel, Android `armv81`, Windows ARM64 reports x64),
  so only Windows 64/32-bit is offered (`cpu.arch`). Core count uses
  `dom.maxHardwareConcurrency`, which can only lower the value; the FPP target
  `NavigatorHWConcurrencyTiered` (default in private windows) overrides it.
  Real architecture still leaks through hardware behavior (e.g. WebAssembly
  relaxed SIMD results), which cannot be changed without C++.
- WebGL: `webgl.override-unmasked-vendor/renderer`. Firefox sanitizes renderer
  strings into buckets (`dom/canvas/SanitizeRenderer.cpp`, e.g. RTX 3060 Ti ->
  "GeForce GTX 980, or similar"), exactly as for real GPUs; give raw driver
  strings in the OS-specific format.
- Values with no pref (WebGL limits, `document.hidden`) are patched in the
  `DeviceSpoofingChild` actor: event `DOMDocElementInserted` with
  `capture: true` (`DOMWindowCreated` did not fire), `allFrames: true`, and
  `safeForUntrustedWebProcess: true` (otherwise it never runs in web content).
  Patch via `Cu.waiveXrays(proto)` + `Cu.exportFunction(fn, win)` so functions
  look native. Actors cannot reach Web Workers: `MAX_VARYING_VECTORS` in an
  OffscreenCanvas worker stays real (known inconsistency, user has not decided
  whether to keep the page patch).
- Prefs without a default in `firefox.js`/`all.js` are sanitized away for web
  content processes; anything the actor reads must have a default.
- Fonts (Windows/macOS presets): a USER_SHEET registered with
  `nsIStyleSheetService` adds `@font-face` aliases (`src: local(<substitute>)`)
  for missing target fonts and hides every other family with a face whose
  `unicode-range` is `U+10FFFD`. User-origin faces are not listed in
  `document.fonts`; `local()` still finds hidden fonts. Generic families
  bypass name lookup, so set `font.name.*` and `font.name-list.*` (target font,
  then the same substitute). System fonts: `ui.font.<id>` and
  `ui.font.<id>.size`; `system-ui` uses `font.name(-list).system-ui.<lang>`.
  `layout.css.font-visibility` would hide non-native fonts, so it is only used
  for Linux/Android presets.
- LookAndFeel ints can be overridden with `ui.<name>` prefs
  (`ui.useOverlayScrollbars`, `ui.primaryPointerCapabilities`, ...); stand-in
  colors (`ui.use_standins_for_native_colors`) take precedence over color prefs.
- Portrait screens (height > width) also get
  `BrowsingContext.setOrientationOverride("portrait-primary", 0)`. The page
  area stays the desktop window unless letterboxing is on; then
  `privacy.resistFingerprinting.letterboxing.dimensions` is set to
  `<width>x<h>` sizes so the page becomes phone-shaped (otherwise "window
  fits on screen" fails in the test page).
- Screen size: `BrowsingContext.setScreenAreaOverride(w, h)` (top-level only,
  applies to frames and CSS `device-width`) and `overrideDPPX`; applied to all
  tabs plus new ones via the `browsing-context-attached` observer. Tabs in
  Responsive Design Mode are skipped.
- Settings framework: `Preferences.addAll` throws if a pref id is already
  registered by another pane (the privacy pane owns the RFP prefs), so observe
  such prefs in a setting's `setup()` instead. Nested controls go in `items`;
  text fields use `control: "moz-input-text"`.

## Open items

- Decide whether to keep the page-only WebGL limit patch (Worker mismatch).
- RAM stripping beyond the current low-memory block was proposed but not
  applied. Safe cuts: fewer kept-alive processes, smaller image/media caches,
  fewer session-history entries, no new-tab page/thumbnails/tab previews/tab
  warm-up/network predictor/onboarding/Firefox View. Trade-offs needing user
  consent: Fission off, Safe Browsing off, socket process off, GPU process off,
  Web Push off.
- Many "Script terminated by timeout" warnings on ad-heavy sites; seen before
  the font/actor changes too, likely WSL software rendering. Not verified.
