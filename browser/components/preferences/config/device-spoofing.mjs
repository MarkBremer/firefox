/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";
import { SettingGroupManager } from "chrome://browser/content/preferences/config/SettingGroupManager.mjs";

const { DeviceSpoofing, GPUS } = ChromeUtils.importESModule(
  "moz-src:///browser/modules/DeviceSpoofing.sys.mjs"
);

const CATEGORY_SETTINGS = {
  navigator: "deviceSpoofingNavigator",
  graphics: "deviceSpoofingGraphics",
  input: "deviceSpoofingInput",
  appearance: "deviceSpoofingAppearance",
  fonts: "deviceSpoofingFonts",
  window: "deviceSpoofingWindow",
  screen: "deviceSpoofingScreen",
  letterboxing: "deviceSpoofingLetterboxing",
  speech: "deviceSpoofingSpeech",
};

const SCREEN_RESOLUTIONS = [
  "1920x1080",
  "1366x768",
  "1536x864",
  "1440x900",
  "1600x900",
  "1280x720",
  "1280x800",
  "1680x1050",
  "1920x1200",
  "2560x1440",
  "3840x2160",
  "1512x982",
  "412x915",
  "390x844",
];
const SCREEN_DPPX = ["1", "1.25", "1.5", "2", "2.625", "3"];

Preferences.addAll([
  { id: "browser.deviceSpoofing.preset", type: "string" },
  { id: "browser.deviceSpoofing.screen.resolution", type: "string" },
  { id: "browser.deviceSpoofing.screen.customResolution", type: "string" },
  { id: "browser.deviceSpoofing.screen.dppx", type: "string" },
  { id: "browser.deviceSpoofing.gpu", type: "string" },
  { id: "browser.deviceSpoofing.gpu.customVendor", type: "string" },
  { id: "browser.deviceSpoofing.gpu.customRenderer", type: "string" },
  { id: "browser.deviceSpoofing.foreground", type: "bool" },
  ...DeviceSpoofing.CATEGORIES.map(category => ({
    id: `browser.deviceSpoofing.${category}`,
    type: "bool",
  })),
]);

const RFP_PREFS = [
  "privacy.resistFingerprinting",
  "privacy.resistFingerprinting.pbmode",
];

Preferences.addSetting({
  id: "deviceSpoofingPreset",
  pref: "browser.deviceSpoofing.preset",
});
// The RFP prefs are registered by the privacy pane, so observe them directly.
Preferences.addSetting({
  id: "deviceSpoofingRFPWarning",
  deps: ["deviceSpoofingPreset"],
  setup(emitChange) {
    RFP_PREFS.forEach(p => Services.prefs.addObserver(p, emitChange));
    return () =>
      RFP_PREFS.forEach(p => Services.prefs.removeObserver(p, emitChange));
  },
  visible: ({ deviceSpoofingPreset }) =>
    Boolean(deviceSpoofingPreset.value) &&
    RFP_PREFS.some(p => Services.prefs.getBoolPref(p, false)),
});
Preferences.addSetting({
  id: "deviceSpoofingReloadNotice",
  deps: ["deviceSpoofingPreset"],
  visible: ({ deviceSpoofingPreset }) => Boolean(deviceSpoofingPreset.value),
});

for (let [category, id] of Object.entries(CATEGORY_SETTINGS)) {
  Preferences.addSetting({
    id,
    pref: `browser.deviceSpoofing.${category}`,
    deps: ["deviceSpoofingPreset"],
    disabled: ({ deviceSpoofingPreset }) => !deviceSpoofingPreset.value,
  });
}

for (let [id, pref] of [
  [
    "deviceSpoofingScreenResolution",
    "browser.deviceSpoofing.screen.resolution",
  ],
  ["deviceSpoofingScreenDPPX", "browser.deviceSpoofing.screen.dppx"],
]) {
  Preferences.addSetting({
    id,
    pref,
    deps: ["deviceSpoofingPreset", "deviceSpoofingScreen"],
    disabled: ({ deviceSpoofingPreset, deviceSpoofingScreen }) =>
      !deviceSpoofingPreset.value || !deviceSpoofingScreen.value,
  });
}

Preferences.addSetting({
  id: "deviceSpoofingScreenCustom",
  pref: "browser.deviceSpoofing.screen.customResolution",
  deps: [
    "deviceSpoofingPreset",
    "deviceSpoofingScreen",
    "deviceSpoofingScreenResolution",
  ],
  visible: ({ deviceSpoofingScreenResolution }) =>
    deviceSpoofingScreenResolution.value == "custom",
  disabled: ({ deviceSpoofingPreset, deviceSpoofingScreen }) =>
    !deviceSpoofingPreset.value || !deviceSpoofingScreen.value,
});

const graphicsDisabled = ({ deviceSpoofingPreset, deviceSpoofingGraphics }) =>
  !deviceSpoofingPreset.value || !deviceSpoofingGraphics.value;

Preferences.addSetting({
  id: "deviceSpoofingGPU",
  pref: "browser.deviceSpoofing.gpu",
  deps: ["deviceSpoofingPreset", "deviceSpoofingGraphics"],
  disabled: graphicsDisabled,
});
for (let [id, pref] of [
  ["deviceSpoofingGPUVendor", "browser.deviceSpoofing.gpu.customVendor"],
  ["deviceSpoofingGPURenderer", "browser.deviceSpoofing.gpu.customRenderer"],
]) {
  Preferences.addSetting({
    id,
    pref,
    deps: [
      "deviceSpoofingPreset",
      "deviceSpoofingGraphics",
      "deviceSpoofingGPU",
    ],
    visible: ({ deviceSpoofingGPU }) => deviceSpoofingGPU.value == "custom",
    disabled: graphicsDisabled,
  });
}
Preferences.addSetting({
  id: "deviceSpoofingGPUUnavailable",
  deps: ["deviceSpoofingPreset", "deviceSpoofingGPU"],
  visible: ({ deviceSpoofingPreset, deviceSpoofingGPU }) =>
    Object.hasOwn(GPUS, deviceSpoofingGPU.value) &&
    !!deviceSpoofingPreset.value &&
    !GPUS[deviceSpoofingGPU.value][deviceSpoofingPreset.value],
});

Preferences.addSetting({
  id: "deviceSpoofingForeground",
  pref: "browser.deviceSpoofing.foreground",
});

SettingGroupManager.registerGroups({
  deviceSpoofingProfile: {
    l10nId: "device-spoofing-profile-group",
    headingLevel: 2,
    items: [
      {
        id: "deviceSpoofingPreset",
        l10nId: "device-spoofing-preset",
        control: "moz-select",
        options: [
          { value: "", l10nId: "device-spoofing-preset-off" },
          { value: "windows", l10nId: "device-spoofing-preset-windows" },
          { value: "macos", l10nId: "device-spoofing-preset-macos" },
          { value: "linux", l10nId: "device-spoofing-preset-linux" },
          { value: "android", l10nId: "device-spoofing-preset-android" },
        ],
      },
      {
        id: "deviceSpoofingRFPWarning",
        l10nId: "device-spoofing-rfp-warning",
        control: "moz-message-bar",
        controlAttrs: { type: "warning" },
      },
      {
        id: "deviceSpoofingReloadNotice",
        l10nId: "device-spoofing-reload-notice",
        control: "moz-message-bar",
        controlAttrs: { type: "info" },
      },
    ],
  },
  deviceSpoofingSignals: {
    l10nId: "device-spoofing-signals-group",
    headingLevel: 2,
    items: [
      {
        id: "deviceSpoofingNavigator",
        l10nId: "device-spoofing-navigator",
      },
      {
        id: "deviceSpoofingGraphics",
        l10nId: "device-spoofing-graphics",
        items: [
          {
            id: "deviceSpoofingGPU",
            l10nId: "device-spoofing-gpu",
            control: "moz-select",
            options: [
              { value: "", l10nId: "device-spoofing-gpu-default" },
              ...Object.entries(GPUS).map(([value, gpu]) => ({
                value,
                l10nId: "device-spoofing-gpu-value",
                l10nArgs: { name: gpu.name },
              })),
              { value: "custom", l10nId: "device-spoofing-gpu-custom" },
            ],
          },
          {
            id: "deviceSpoofingGPUVendor",
            l10nId: "device-spoofing-gpu-custom-vendor",
            control: "moz-input-text",
          },
          {
            id: "deviceSpoofingGPURenderer",
            l10nId: "device-spoofing-gpu-custom-renderer",
            control: "moz-input-text",
          },
          {
            id: "deviceSpoofingGPUUnavailable",
            l10nId: "device-spoofing-gpu-unavailable",
            control: "moz-message-bar",
            controlAttrs: { type: "warning" },
          },
        ],
      },
      {
        id: "deviceSpoofingInput",
        l10nId: "device-spoofing-input",
      },
      {
        id: "deviceSpoofingAppearance",
        l10nId: "device-spoofing-appearance",
      },
      {
        id: "deviceSpoofingFonts",
        l10nId: "device-spoofing-fonts",
      },
      {
        id: "deviceSpoofingWindow",
        l10nId: "device-spoofing-window2",
      },
      {
        id: "deviceSpoofingScreen",
        l10nId: "device-spoofing-screen",
        items: [
          {
            id: "deviceSpoofingScreenResolution",
            l10nId: "device-spoofing-screen-resolution",
            control: "moz-select",
            options: [
              { value: "", l10nId: "device-spoofing-screen-resolution-auto" },
              ...SCREEN_RESOLUTIONS.map(value => {
                let [width, height] = value.split("x");
                return {
                  value,
                  l10nId: "device-spoofing-screen-resolution-value",
                  l10nArgs: { width, height },
                };
              }),
              {
                value: "custom",
                l10nId: "device-spoofing-screen-resolution-custom",
              },
            ],
          },
          {
            id: "deviceSpoofingScreenCustom",
            l10nId: "device-spoofing-screen-resolution-custom-input",
            control: "moz-input-text",
            controlAttrs: { placeholder: "1920x1080" },
          },
          {
            id: "deviceSpoofingScreenDPPX",
            l10nId: "device-spoofing-screen-dppx",
            control: "moz-select",
            options: [
              { value: "", l10nId: "device-spoofing-screen-dppx-auto" },
              ...SCREEN_DPPX.map(value => ({
                value,
                l10nId: "device-spoofing-screen-dppx-value",
                l10nArgs: { ratio: value },
              })),
            ],
          },
        ],
      },
      {
        id: "deviceSpoofingLetterboxing",
        l10nId: "device-spoofing-letterboxing",
      },
      {
        id: "deviceSpoofingSpeech",
        l10nId: "device-spoofing-speech",
      },
    ],
  },
  deviceSpoofingBehavior: {
    l10nId: "device-spoofing-behavior-group",
    headingLevel: 2,
    items: [
      {
        id: "deviceSpoofingForeground",
        l10nId: "device-spoofing-foreground",
      },
    ],
  },
});
