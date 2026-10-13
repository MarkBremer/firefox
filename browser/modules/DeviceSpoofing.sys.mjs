/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const PREF_BRANCH = "browser.deviceSpoofing.";
const PREF_PRESET = PREF_BRANCH + "preset";
const PREF_APPLIED = PREF_BRANCH + "applied";
const ACTOR_NAME = "DeviceSpoofing";

const FPP_OVERRIDE_PREFS = [
  "privacy.fingerprintingProtection.overrides",
  "privacy.baselineFingerprintingProtection.overrides",
];

// Bits of the PointerCapabilities enum in layout/style/ServoTypes.h.
const POINTER_COARSE = 1;
const POINTER_FINE = 2;
const POINTER_HOVER = 4;

const DESKTOP_INPUT = {
  touchEvents: 0,
  maxTouchPoints: 0,
  pointer: POINTER_FINE | POINTER_HOVER,
};

const SYSTEM_FONT_IDS = [
  "caption",
  "icon",
  "menu",
  "message-box",
  "small-caption",
  "status-bar",
  "-moz-pull-down-menu",
  "-moz-button",
  "-moz-list",
  "-moz-field",
];

const GENERIC_FONT_LANGS = ["x-western", "x-unicode", "x-cyrillic", "el"];

// Locally installed fonts used to render spoofed families that are missing.
const LOCAL_SUBSTITUTES = {
  sans: ["Liberation Sans", "Arimo", "DejaVu Sans", "Noto Sans", "FreeSans"],
  serif: [
    "Liberation Serif",
    "Tinos",
    "DejaVu Serif",
    "Noto Serif",
    "FreeSerif",
  ],
  monospace: [
    "Liberation Mono",
    "Cousine",
    "DejaVu Sans Mono",
    "Noto Sans Mono",
    "FreeMono",
  ],
  emoji: ["Twemoji Mozilla", "Noto Color Emoji"],
};

// Names fontconfig resolves through aliases, so they are not enumerated as
// installed families but still match on Linux.
const LINUX_ALIAS_FAMILIES = [
  "Bitstream Vera Sans",
  "Bitstream Vera Sans Mono",
  "Bitstream Vera Serif",
  "Arimo",
  "Cousine",
  "Tinos",
  "Nimbus Sans",
  "Nimbus Sans L",
  "Nimbus Roman",
  "Nimbus Roman No9 L",
  "Nimbus Mono PS",
  "Nimbus Mono L",
  "URW Gothic",
  "URW Bookman",
  "C059",
  "P052",
  "Cantarell",
  "Ubuntu",
  "Ubuntu Mono",
  "Noto Sans",
  "Noto Serif",
  "Noto Mono",
  "Noto Color Emoji",
  "Droid Sans",
  "Droid Sans Mono",
  "Droid Serif",
  "FreeSans",
  "FreeSerif",
  "FreeMono",
  "Adwaita Sans",
  "Adwaita Mono",
  "Liberation Sans",
  "Liberation Serif",
  "Liberation Mono",
  "DejaVu Sans",
  "DejaVu Serif",
  "DejaVu Sans Mono",
];

// Fonts installed by default on Windows 10/11.
const WINDOWS_FAMILIES = {
  sans: [
    "Arial",
    "Arial Black",
    "Bahnschrift",
    "Calibri",
    "Candara",
    "Comic Sans MS",
    "Corbel",
    "Ebrima",
    "Franklin Gothic Medium",
    "Gabriola",
    "Gadugi",
    "HoloLens MDL2 Assets",
    "Impact",
    "Ink Free",
    "Javanese Text",
    "Leelawadee UI",
    "Lucida Sans Unicode",
    "Malgun Gothic",
    "Marlett",
    "Microsoft Himalaya",
    "Microsoft JhengHei",
    "Microsoft New Tai Lue",
    "Microsoft PhagsPa",
    "Microsoft Sans Serif",
    "Microsoft Tai Le",
    "Microsoft YaHei",
    "Microsoft Yi Baiti",
    "Mongolian Baiti",
    "MS Gothic",
    "MV Boli",
    "Myanmar Text",
    "Nirmala UI",
    "Segoe Fluent Icons",
    "Segoe MDL2 Assets",
    "Segoe Print",
    "Segoe Script",
    "Segoe UI",
    "Segoe UI Black",
    "Segoe UI Historic",
    "Segoe UI Light",
    "Segoe UI Semibold",
    "Segoe UI Semilight",
    "Segoe UI Symbol",
    "Segoe UI Variable",
    "Symbol",
    "Tahoma",
    "Trebuchet MS",
    "Verdana",
    "Webdings",
    "Wingdings",
    "Yu Gothic",
  ],
  serif: [
    "Cambria",
    "Cambria Math",
    "Constantia",
    "Georgia",
    "MingLiU-ExtB",
    "Palatino Linotype",
    "SimSun",
    "Sitka",
    "Sylfaen",
    "Times New Roman",
  ],
  monospace: ["Consolas", "Courier New", "Lucida Console"],
  emoji: ["Segoe UI Emoji", "Twemoji Mozilla"],
};

// Fonts installed by default on macOS.
const MAC_FAMILIES = {
  sans: [
    "American Typewriter",
    "Apple SD Gothic Neo",
    "Arial",
    "Arial Black",
    "Avenir",
    "Avenir Next",
    "Chalkboard",
    "Comic Sans MS",
    "Futura",
    "Geneva",
    "Gill Sans",
    "Helvetica",
    "Helvetica Neue",
    "Hiragino Sans",
    "Impact",
    "Lucida Grande",
    "Marker Felt",
    "Optima",
    "PingFang SC",
    "Skia",
    "Tahoma",
    "Trebuchet MS",
    "Verdana",
  ],
  serif: [
    "Baskerville",
    "Didot",
    "Georgia",
    "Hoefler Text",
    "Palatino",
    "Times",
    "Times New Roman",
  ],
  monospace: ["Andale Mono", "Courier", "Courier New", "Menlo", "Monaco"],
  emoji: ["Apple Color Emoji"],
};

/**
 * Values mirror what an unmodified Firefox reports on each platform.
 * WebGL renderer strings are fed through webgl::SanitizeRenderer, so they are
 * given in their raw driver form.
 */
/**
 * Selectable GPUs, with the raw WebGL strings each OS driver stack reports.
 * Firefox sanitizes the renderer before exposing it, as it does for real GPUs.
 */
export const GPUS = Object.freeze({
  "nvidia-rtx-3060-ti": {
    name: "NVIDIA GeForce RTX 3060 Ti",
    windows: {
      vendor: "Google Inc. (NVIDIA)",
      renderer:
        "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    linux: {
      vendor: "NVIDIA Corporation",
      renderer: "NVIDIA GeForce RTX 3060 Ti/PCIe/SSE2",
    },
  },
  "nvidia-rtx-4070": {
    name: "NVIDIA GeForce RTX 4070",
    windows: {
      vendor: "Google Inc. (NVIDIA)",
      renderer:
        "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    linux: {
      vendor: "NVIDIA Corporation",
      renderer: "NVIDIA GeForce RTX 4070/PCIe/SSE2",
    },
  },
  "nvidia-gtx-1660-super": {
    name: "NVIDIA GeForce GTX 1660 SUPER",
    windows: {
      vendor: "Google Inc. (NVIDIA)",
      renderer:
        "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    linux: {
      vendor: "NVIDIA Corporation",
      renderer: "NVIDIA GeForce GTX 1660 SUPER/PCIe/SSE2",
    },
  },
  "amd-rx-6700-xt": {
    name: "AMD Radeon RX 6700 XT",
    windows: {
      vendor: "Google Inc. (AMD)",
      renderer:
        "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    linux: {
      vendor: "AMD",
      renderer:
        "AMD Radeon RX 6700 XT (radeonsi, navi22, LLVM 17.0.6, DRM 3.57, 6.8.0)",
    },
  },
  "intel-uhd-630": {
    name: "Intel UHD Graphics 630",
    windows: {
      vendor: "Google Inc. (Intel)",
      renderer:
        "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    linux: {
      vendor: "Intel",
      renderer: "Mesa Intel(R) UHD Graphics 630 (CFL GT2)",
    },
    macos: {
      vendor: "Intel Inc.",
      renderer: "Intel(R) UHD Graphics 630",
    },
  },
});

export const PRESETS = Object.freeze({
  windows: {
    uaOS: "Windows NT 10.0; Win64; x64",
    geckoTrail: "20100101",
    platform: "Win32",
    oscpu: "Windows NT 10.0; Win64; x64",
    appVersion: "5.0 (Windows)",
    webglVendor: "Google Inc. (Intel)",
    webglRenderer:
      "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    // ANGLE on Direct3D 11 limits, keyed by GLenum.
    webglParams: {
      0x8dfc: 30, // MAX_VARYING_VECTORS
      0x8b4b: 120, // MAX_VARYING_COMPONENTS
    },
    input: DESKTOP_INPUT,
    scrollbarStyle: 5,
    overlayScrollbars: false,
    scrollbarSize: 17,
    screen: { width: 1920, height: 1080 },
    fonts: {
      system: "Segoe UI",
      systemSize: "12",
      serif: "Times New Roman",
      sans: "Arial",
      monospace: "Consolas",
      families: WINDOWS_FAMILIES,
    },
  },
  macos: {
    uaOS: "Macintosh; Intel Mac OS X 10.15",
    geckoTrail: "20100101",
    platform: "MacIntel",
    oscpu: "Intel Mac OS X 10.15",
    appVersion: "5.0 (Macintosh)",
    webglVendor: "Apple",
    webglRenderer: "Apple M1",
    input: DESKTOP_INPUT,
    screen: { width: 1512, height: 982 },
    scrollbarStyle: 1,
    overlayScrollbars: true,
    fonts: {
      system: "-apple-system",
      systemSize: "13",
      serif: "Times",
      sans: "Helvetica",
      monospace: "Menlo",
      families: MAC_FAMILIES,
    },
  },
  linux: {
    uaOS: "X11; Linux x86_64",
    geckoTrail: "20100101",
    platform: "Linux x86_64",
    oscpu: "Linux x86_64",
    appVersion: "5.0 (X11)",
    webglVendor: "Intel",
    webglRenderer: "Mesa Intel(R) UHD Graphics 620 (KBL GT2)",
    input: DESKTOP_INPUT,
    screen: { width: 1920, height: 1080 },
    scrollbarStyle: 2,
    overlayScrollbars: true,
    fonts: {
      system: "Cantarell",
      systemSize: "14.667",
    },
  },
  android: {
    uaOS: "Android 10; Mobile",
    geckoTrail: null,
    platform: "Linux armv81",
    oscpu: "Linux armv81",
    appVersion: "5.0 (Android 10)",
    webglVendor: "Qualcomm",
    webglRenderer: "Adreno (TM) 640",
    input: { touchEvents: 1, maxTouchPoints: 5, pointer: POINTER_COARSE },
    screen: { width: 412, height: 915 },
    scrollbarStyle: 3,
    overlayScrollbars: true,
    fonts: {
      system: "Roboto",
      systemSize: "14",
    },
  },
});

function installedFontFamilies() {
  let enumerator = Cc["@mozilla.org/gfx/fontenumerator;1"].getService(
    Ci.nsIFontEnumerator
  );
  return enumerator.EnumerateAllFonts();
}

function cssString(name) {
  return `"${name.replace(/[\\"]/g, "\\$&")}"`;
}

/**
 * Builds a user style sheet that makes the preset's font families available
 * (rendered with a local substitute when missing) and hides every other
 * installed family from name lookups. Generic families still resolve to the
 * hidden fonts, so text keeps rendering.
 *
 * @returns {{ css: string, substitutes: Record<string, string> }}
 */
function buildFontSheet(families) {
  let installed = installedFontFamilies();
  let installedLower = new Set(installed.map(f => f.toLowerCase()));
  let substitutes = {};
  for (let [kind, candidates] of Object.entries(LOCAL_SUBSTITUTES)) {
    substitutes[kind] = candidates.find(f =>
      installedLower.has(f.toLowerCase())
    );
  }

  let rules = [];
  let exposed = new Set();
  for (let [kind, names] of Object.entries(families)) {
    let substitute = substitutes[kind] ?? substitutes.sans;
    for (let name of names) {
      exposed.add(name.toLowerCase());
      if (installedLower.has(name.toLowerCase()) || !substitute) {
        continue;
      }
      rules.push(
        `@font-face { font-family: ${cssString(name)}; src: local(${cssString(substitute)}); }`,
        `@font-face { font-family: ${cssString(name)}; font-weight: bold; src: local(${cssString(substitute + " Bold")}), local(${cssString(substitute)}); }`
      );
    }
  }

  // A family defined in the document font set shadows the platform font of
  // the same name; covering only an unused code point makes it unmatched.
  let hideSrc = substitutes.sans ? `local(${cssString(substitutes.sans)})` : "";
  if (hideSrc) {
    let hidden = new Set();
    for (let name of [...installed, ...LINUX_ALIAS_FAMILIES]) {
      let key = name.toLowerCase();
      if (!exposed.has(key) && !hidden.has(key)) {
        hidden.add(key);
        rules.push(
          `@font-face { font-family: ${cssString(name)}; src: ${hideSrc}; unicode-range: U+10FFFD; }`
        );
      }
    }
  }
  return { css: rules.join("\n"), substitutes };
}

/**
 * Each category maps a preset to the prefs it writes, the fingerprinting
 * protection targets it enables, an optional user style sheet and whether the
 * page-level WebGL patch is needed. Category names match the boolean prefs
 * `browser.deviceSpoofing.<category>`.
 */
const CATEGORIES = {
  navigator: (preset, version, presetName) => {
    let gecko = preset.geckoTrail ?? version;
    let { uaOS, oscpu } = preset;
    // Firefox freezes the architecture elsewhere (x86_64 on Linux, Intel on
    // macOS, ARM on Android); only Windows has a real 32-bit variant.
    if (
      presetName == "windows" &&
      Services.prefs.getBoolPref(PREF_BRANCH + "cpu", true) &&
      Services.prefs.getStringPref(PREF_BRANCH + "cpu.arch", "") == "x86"
    ) {
      uaOS = uaOS.replace("; Win64; x64", "");
      oscpu = oscpu.replace("; Win64; x64", "");
    }
    return {
      prefs: {
        "general.useragent.override": `Mozilla/5.0 (${uaOS}; rv:${version}) Gecko/${gecko} Firefox/${version}`,
        "general.platform.override": preset.platform,
        "general.oscpu.override": oscpu,
        "general.appversion.override": preset.appVersion,
      },
    };
  },
  cpu: () => {
    let cores = parseInt(
      Services.prefs.getStringPref(PREF_BRANCH + "cpu.cores", "")
    );
    // Gecko can only lower the reported core count.
    return cores > 0 ? { prefs: { "dom.maxHardwareConcurrency": cores } } : {};
  },
  graphics: (preset, _version, presetName) => {
    let gpu = Services.prefs.getStringPref(PREF_BRANCH + "gpu", "");
    let vendor = preset.webglVendor;
    let renderer = preset.webglRenderer;
    if (gpu == "custom") {
      vendor =
        Services.prefs.getStringPref(PREF_BRANCH + "gpu.customVendor", "") ||
        vendor;
      renderer =
        Services.prefs.getStringPref(PREF_BRANCH + "gpu.customRenderer", "") ||
        renderer;
    } else if (Object.hasOwn(GPUS, gpu) && GPUS[gpu][presetName]) {
      ({ vendor, renderer } = GPUS[gpu][presetName]);
    }
    return {
      prefs: {
        "webgl.override-unmasked-vendor": vendor,
        "webgl.override-unmasked-renderer": renderer,
      },
      webglPatch: !!preset.webglParams,
    };
  },
  input: preset => ({
    prefs: {
      "dom.w3c_touch_events.enabled": preset.input.touchEvents,
      "dom.maxtouchpoints.testing.value": preset.input.maxTouchPoints,
      "ui.primaryPointerCapabilities": preset.input.pointer,
      "ui.allPointerCapabilities": preset.input.pointer,
    },
  }),
  appearance: preset => ({
    prefs: {
      "widget.non-native-theme.scrollbar.style": preset.scrollbarStyle,
      "ui.useOverlayScrollbars": preset.overlayScrollbars ? 1 : 0,
      ...(preset.scrollbarSize
        ? {
            "widget.non-native-theme.scrollbar.size.override":
              preset.scrollbarSize,
          }
        : {}),
      "ui.use_standins_for_native_colors": true,
    },
    targets: ["DOMStyleOsxFontSmoothing"],
  }),
  fonts: preset => {
    let { fonts } = preset;
    let prefs = {};
    for (let id of SYSTEM_FONT_IDS) {
      prefs[`ui.font.${id}`] = fonts.system;
      prefs[`ui.font.${id}.size`] = fonts.systemSize;
    }
    if (!fonts.families) {
      prefs["layout.css.font-visibility"] = 1;
      return { prefs, targets: ["FontVisibilityBaseSystem"] };
    }

    let { css, substitutes } = buildFontSheet(fonts.families);
    for (let lang of GENERIC_FONT_LANGS) {
      prefs[`font.name.system-ui.${lang}`] = fonts.system;
      if (substitutes.sans) {
        prefs[`font.name-list.system-ui.${lang}`] =
          `${fonts.system}, ${substitutes.sans}`;
      }
    }
    for (let kind of ["serif", "sans", "monospace"]) {
      let generic = kind == "sans" ? "sans-serif" : kind;
      for (let lang of GENERIC_FONT_LANGS) {
        prefs[`font.name.${generic}.${lang}`] = fonts[kind];
        // Fall back to the same local font that renders the spoofed family.
        if (substitutes[kind]) {
          prefs[`font.name-list.${generic}.${lang}`] =
            `${fonts[kind]}, ${substitutes[kind]}`;
        }
      }
    }
    return { prefs, sheet: css };
  },
  window: () => ({
    // Not WindowOuterSize: outer == inner (no toolbars) is itself a tell.
    targets: ["WindowScreenXY", "WindowInnerScreenXY"],
  }),
  screen: preset => {
    let resolution = Services.prefs.getStringPref(
      PREF_BRANCH + "screen.resolution",
      ""
    );
    if (resolution == "custom") {
      resolution = Services.prefs.getStringPref(
        PREF_BRANCH + "screen.customResolution",
        ""
      );
    }
    let match = /^\s*(\d{3,5})\s*[x×]\s*(\d{3,5})\s*$/i.exec(resolution);
    let dppx = parseFloat(
      Services.prefs.getStringPref(PREF_BRANCH + "screen.dppx", "")
    );
    return {
      screen: {
        width: match ? parseInt(match[1]) : preset.screen.width,
        height: match ? parseInt(match[2]) : preset.screen.height,
        dppx: dppx > 0 ? dppx : 0,
      },
      targets: ["ScreenPixelDepth"],
    };
  },
  letterboxing: () => ({
    prefs: { "privacy.resistFingerprinting.letterboxing": true },
  }),
  speech: () => ({
    prefs: { "media.webspeech.synth.enabled": false },
  }),
};

// Not tied to a device preset: hides that a tab or window is in the background.
const FOREGROUND_PREFS = {
  "dom.min_background_timeout_value": 4,
  "dom.min_background_timeout_value_without_budget_throttling": 4,
  "dom.timeout.enable_budget_timer_throttling": false,
  "media.block-autoplay-until-in-foreground": false,
};

export const DeviceSpoofing = {
  CATEGORIES: Object.keys(CATEGORIES),
  _initialized: false,
  _sheetURI: null,
  _actorRegistered: false,
  // Screen override currently applied to top-level tabs, if any.
  _screen: null,
  _screenApplied: false,

  init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
    this.apply();
    Services.prefs.addObserver(PREF_BRANCH, this);
    Services.obs.addObserver(this, "browsing-context-attached");
  },

  observe(subject, topic, data) {
    if (topic == "browsing-context-attached") {
      if (this._screenApplied) {
        this._applyScreen(subject);
      }
    } else if (data != PREF_APPLIED) {
      this.apply();
    }
  },

  /**
   * @param {CanonicalBrowsingContext} bc
   */
  _applyScreen(bc) {
    // Leave Responsive Design Mode and non-tab contexts alone.
    if (!bc.isContent || bc.parent || bc.inRDMPane || bc.isDiscarded) {
      return;
    }
    try {
      if (this._screen) {
        let { width, height } = this._screen;
        bc.setScreenAreaOverride(width, height);
        bc.overrideDPPX = this._screen.dppx;
        if (height > width) {
          bc.setOrientationOverride("portrait-primary", 0);
        } else {
          bc.resetOrientationOverride();
        }
      } else {
        bc.resetScreenAreaOverride();
        bc.resetOrientationOverride();
        bc.overrideDPPX = 0;
      }
    } catch (e) {
      console.error(e);
    }
  },

  _updateScreens(screen) {
    if (!screen && !this._screenApplied) {
      return;
    }
    this._screen = screen;
    for (let win of Services.wm.getEnumerator("navigator:browser")) {
      for (let browser of win.gBrowser?.browsers ?? []) {
        if (browser.browsingContext) {
          this._applyScreen(browser.browsingContext);
        }
      }
    }
    this._screenApplied = !!screen;
  },

  _readApplied() {
    try {
      let { prefs = [], targets = [] } = JSON.parse(
        Services.prefs.getStringPref(PREF_APPLIED, "{}")
      );
      return { prefs, targets };
    } catch {
      return { prefs: [], targets: [] };
    }
  },

  _setPref(name, value) {
    switch (typeof value) {
      case "boolean":
        Services.prefs.setBoolPref(name, value);
        break;
      case "number":
        Services.prefs.setIntPref(name, value);
        break;
      default:
        Services.prefs.setStringPref(name, value);
    }
  },

  /**
   * @param {Set<string>} previous Targets this module enabled last time.
   * @param {Set<string>} desired Targets that should now be enabled.
   */
  _updateOverrideTargets(previous, desired) {
    for (let pref of FPP_OVERRIDE_PREFS) {
      let tokens = Services.prefs
        .getStringPref(pref, "")
        .split(",")
        .map(t => t.trim())
        .filter(t => t && !previous.has(t.replace(/^\+/, "")));
      for (let target of desired) {
        if (!tokens.includes(`+${target}`)) {
          tokens.push(`+${target}`);
        }
      }
      let value = tokens.join(",");
      if (value) {
        Services.prefs.setStringPref(pref, value);
      } else {
        Services.prefs.clearUserPref(pref);
      }
    }
  },

  _updateSheet(css) {
    let sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(
      Ci.nsIStyleSheetService
    );
    let uri = css
      ? Services.io.newURI(
          "data:text/css;charset=utf-8," + encodeURIComponent(css)
        )
      : null;
    if (this._sheetURI && (!uri || !this._sheetURI.equals(uri))) {
      sss.unregisterSheet(this._sheetURI, sss.USER_SHEET);
      this._sheetURI = null;
    }
    if (uri && !this._sheetURI) {
      sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
      this._sheetURI = uri;
    }
  },

  _updateActor(enabled) {
    if (enabled == this._actorRegistered) {
      return;
    }
    if (enabled) {
      ChromeUtils.registerWindowActor(ACTOR_NAME, {
        child: {
          esModuleURI: "moz-src:///browser/modules/DeviceSpoofingChild.sys.mjs",
          events: { DOMDocElementInserted: { capture: true } },
        },
        allFrames: true,
        // Child-only actor: it never messages the parent.
        safeForUntrustedWebProcess: true,
      });
    } else {
      ChromeUtils.unregisterWindowActor(ACTOR_NAME);
    }
    this._actorRegistered = enabled;
  },

  apply() {
    let presetName = Services.prefs.getStringPref(PREF_PRESET, "");
    let preset = Object.hasOwn(PRESETS, presetName)
      ? PRESETS[presetName]
      : null;
    let version = `${parseInt(Services.appinfo.version)}.0`;

    let desiredPrefs = new Map();
    let desiredTargets = new Set();
    let sheets = [];
    let webglPatch = false;
    let screen = null;
    if (preset) {
      for (let [category, build] of Object.entries(CATEGORIES)) {
        if (!Services.prefs.getBoolPref(PREF_BRANCH + category, true)) {
          continue;
        }
        let result = build(preset, version, presetName);
        for (let [name, value] of Object.entries(result.prefs ?? {})) {
          desiredPrefs.set(name, value);
        }
        result.targets?.forEach(t => desiredTargets.add(t));
        if (result.sheet) {
          sheets.push(result.sheet);
        }
        webglPatch ||= !!result.webglPatch;
        screen ??= result.screen ?? null;
      }
    }
    let foreground = Services.prefs.getBoolPref(
      PREF_BRANCH + "foreground",
      false
    );
    // A portrait screen needs a portrait page area to stay believable;
    // letterboxing picks the largest of these that fits the window.
    if (
      screen &&
      screen.height > screen.width &&
      desiredPrefs.has("privacy.resistFingerprinting.letterboxing")
    ) {
      let sizes = [];
      for (let h = screen.height - 56; h >= 400; h -= 20) {
        sizes.push(`${screen.width}x${h}`);
      }
      desiredPrefs.set(
        "privacy.resistFingerprinting.letterboxing.dimensions",
        sizes.join(",")
      );
    }
    if (foreground) {
      for (let [name, value] of Object.entries(FOREGROUND_PREFS)) {
        desiredPrefs.set(name, value);
      }
    }

    let previous = this._readApplied();
    for (let name of previous.prefs) {
      if (!desiredPrefs.has(name)) {
        Services.prefs.clearUserPref(name);
      }
    }
    for (let [name, value] of desiredPrefs) {
      this._setPref(name, value);
    }
    this._updateOverrideTargets(new Set(previous.targets), desiredTargets);
    this._updateSheet(sheets.join("\n"));
    this._updateActor(webglPatch || foreground);
    this._updateScreens(screen);

    if (desiredPrefs.size || desiredTargets.size) {
      Services.prefs.setStringPref(
        PREF_APPLIED,
        JSON.stringify({
          prefs: [...desiredPrefs.keys()],
          targets: [...desiredTargets],
        })
      );
    } else {
      Services.prefs.clearUserPref(PREF_APPLIED);
    }
  },
};
