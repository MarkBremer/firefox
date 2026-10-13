![Firefox Browser](./docs/readme/readme-banner.svg)

[Firefox](https://firefox.com/) is a fast, reliable and private web browser from the non-profit [Mozilla organization](https://mozilla.org/).

### Contributing

To learn how to contribute to Firefox read the [Firefox Contributors' Quick Reference document](https://firefox-source-docs.mozilla.org/contributing/contribution_quickref.html).

We use [bugzilla.mozilla.org](https://bugzilla.mozilla.org/) as our issue tracker, please file bugs there.

### Resources

* [Firefox Source Docs](https://firefox-source-docs.mozilla.org/) is our primary documentation repository
* Nightly development builds can be downloaded from [Firefox Nightly page](https://www.mozilla.org/firefox/channel/desktop/#nightly)

If you have a question about developing Firefox, and can't find the solution
on [Firefox Source Docs](https://firefox-source-docs.mozilla.org/), you can try asking your question on Matrix at
chat.mozilla.org in the [Introduction channel](https://chat.mozilla.org/#/room/#introduction:mozilla.org).

---

## Patches in this fork

Base: Firefox 158 release (`1a0cfe22a2d8`). All changes are front-end only
(JS, CSS, strings, prefs), so an artifact build is enough.

### 1. Low-memory and privacy defaults

| File | Change |
|---|---|
| `browser/app/profile/firefox.js` | 4 content processes, no process prelaunch, no bfcache viewers, 3 undo-close tabs, 32 MB memory cache, unload tabs on low memory, accessibility off. `about:blank` home page, no new-tab preload. AI/ML features, translations, reader-mode parsing, Firefox Accounts, address/card autofill and trending suggestions off. No link prefetch or speculative connections. Telemetry, Normandy, studies, discovery and add-on recommendations off. |
| `modules/libpref/init/all.js` | `datareporting.usage.uploadEnabled` off; `datareporting.healthreport.uploadEnabled` keeps its StaticPrefList default (off). |

### 2. Device / OS spoofing

New **Settings → Device spoofing** pane. Choose a device to report (Windows
10/11, macOS, Linux, Android phone) and which signals to align with it.

| Signal | What websites see | Mechanism |
|---|---|---|
| User agent and navigator | HTTP `User-Agent`, `navigator.userAgent`, `platform`, `oscpu`, `appVersion` (pages and workers); Firefox version kept current on every start | `general.*.override` prefs |
| Graphics driver | WebGL vendor/renderer for a chosen GPU (RTX 3060 Ti, RTX 4070, GTX 1660 SUPER, RX 6700 XT, UHD 630) or custom strings, in the OS-specific driver format; Windows ANGLE limits (`MAX_VARYING_VECTORS` 30, `MAX_VARYING_COMPONENTS` 120) | `webgl.override-unmasked-*` prefs; `getParameter()` wrapped per page by a JS window actor |
| Touch and pointer | Touch events, `maxTouchPoints`, `pointer`/`hover` media queries | `dom.w3c_touch_events.enabled`, `dom.maxtouchpoints.testing.value`, `ui.*PointerCapabilities` |
| Scrollbars and system colors | Scrollbar style and width (17 px on Windows), stand-in system colors, no `-moz-osx-font-smoothing` | `widget.non-native-theme.scrollbar.*`, `ui.useOverlayScrollbars`, `ui.use_standins_for_native_colors`, fingerprinting-protection target |
| Fonts | The reported OS's fonts exist (drawn with similar local fonts when missing), every other installed font is hidden; system fonts and defaults (Segoe UI, Arial, Times New Roman, Consolas) | User style sheet with `@font-face` aliases and hiding rules; `ui.font.*`, `font.name.*`, `font.name-list.*` prefs. Linux/Android presets restrict to base system fonts instead |
| Screen | `screen.width/height`, CSS `device-width/height`, 24-bit color depth; preset, list (incl. 1680×1050) or custom resolution; optional device pixel ratio | `BrowsingContext.setScreenAreaOverride()` / `overrideDPPX` on every tab |
| Window position | `screenX/Y` reported as 0 | Fingerprinting-protection targets |
| Letterboxing (off by default) | Page area rounded to common sizes | `privacy.resistFingerprinting.letterboxing` |
| Speech synthesis | API disabled (voice list is OS-specific) | `media.webspeech.synth.enabled` |
| Pages always in foreground (independent of preset) | `document.hidden` false, `visibilityState` visible, `hasFocus()` true, no `visibilitychange`/window `blur`/`focus` events, unthrottled background timers | Getters/methods replaced per page by the JS window actor; timer and autoplay prefs |

All settings are prefs under `browser.deviceSpoofing.*`, listed with their
defaults and comments in `browser/app/profile/firefox.js`. The module records
every pref it writes (`browser.deviceSpoofing.applied`) and clears exactly those
when a signal or the whole feature is turned off.

| File | Purpose |
|---|---|
| `browser/modules/DeviceSpoofing.sys.mjs` | Presets, GPU list, applies prefs, font sheet, screen overrides, actor registration |
| `browser/modules/DeviceSpoofingChild.sys.mjs` | Per-page patches (WebGL limits, foreground) |
| `browser/components/BrowserComponents.manifest` | Starts the module before the UI (`browser-before-ui-startup`) |
| `browser/modules/moz.build` | Registers both modules (`MOZ_SRC_FILES`) |
| `browser/components/preferences/config/device-spoofing.mjs` | Settings pane controls |
| `browser/components/preferences/preferences.js`, `preferences.xhtml`, `jar.mn` | Pane registration and navigation entry |
| `browser/locales/en-US/browser/preferences/preferences.ftl` | UI strings ("Device and OS spoofing page") |
| `browser/components/preferences/tests/browser_device_spoofing_pane.js`, `browser-srd.toml` | Browser test |

**Known limits:** exact font metrics and GPU rendering output stay those of the
real machine; the WebGL limit patch does not reach Web Workers (OffscreenCanvas
there reports the real value); `requestAnimationFrame` still pauses in
background tabs; Resist Fingerprinting (`privacy.resistFingerprinting`) overrides
most values with the real OS and the pane warns about it.

### 3. Repository tooling

* `.github/copilot-instructions.md`: build, test and lint instructions for coding agents.

### Build, run and test

```sh
./mach --no-interactive bootstrap --application-choice browser_artifact_mode  # once
./mach build                 # after moz.build / jar.mn / manifest changes
./mach build faster          # after JS / CSS / FTL changes only
./mach run --purgecaches about:preferences#deviceSpoofing
./mach test browser/components/preferences/tests/browser_device_spoofing_pane.js --headless
```

Test pages: abrahamjuliot.github.io/creepjs, pixelscan.net, browserleaks.com,
amiunique.org.
