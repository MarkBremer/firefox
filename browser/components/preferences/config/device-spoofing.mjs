/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";
import { SettingGroupManager } from "chrome://browser/content/preferences/config/SettingGroupManager.mjs";

const { DeviceSpoofing } = ChromeUtils.importESModule(
  "moz-src:///browser/modules/DeviceSpoofing.sys.mjs"
);

const CATEGORY_SETTINGS = {
  navigator: "deviceSpoofingNavigator",
  graphics: "deviceSpoofingGraphics",
  input: "deviceSpoofingInput",
  appearance: "deviceSpoofingAppearance",
  fonts: "deviceSpoofingFonts",
  window: "deviceSpoofingWindow",
  speech: "deviceSpoofingSpeech",
};

Preferences.addAll([
  { id: "browser.deviceSpoofing.preset", type: "string" },
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
        l10nId: "device-spoofing-window",
      },
      {
        id: "deviceSpoofingSpeech",
        l10nId: "device-spoofing-speech",
      },
    ],
  },
});
