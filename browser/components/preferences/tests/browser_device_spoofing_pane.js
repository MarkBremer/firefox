/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PRESET_PREF = "browser.deviceSpoofing.preset";
const FPP_PREFS = [
  "privacy.fingerprintingProtection.overrides",
  "privacy.baselineFingerprintingProtection.overrides",
];

registerCleanupFunction(() => {
  Services.prefs.clearUserPref(PRESET_PREF);
  Services.prefs.clearUserPref("browser.deviceSpoofing.navigator");
});

add_task(async function test_pane_controls() {
  let tab = await openPrefsTab("deviceSpoofing");
  let doc = tab.linkedBrowser.contentDocument;

  is_element_visible(
    doc.getElementById("category-device-spoofing"),
    "Device spoofing category is visible"
  );

  let navigatorBox = await TestUtils.waitForCondition(() =>
    doc.getElementById("deviceSpoofingNavigator")
  );
  ok(navigatorBox.disabled, "Signals are disabled without a preset");

  Services.prefs.setStringPref(PRESET_PREF, "windows");
  await TestUtils.waitForCondition(
    () => !navigatorBox.disabled,
    "Signals become enabled once a preset is chosen"
  );
  is(
    doc.getElementById("deviceSpoofingPreset").value,
    "windows",
    "Select reflects the preset pref"
  );

  Services.prefs.clearUserPref(PRESET_PREF);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_prefs_applied_and_reverted() {
  Services.prefs.setStringPref(PRESET_PREF, "windows");

  is(
    Services.prefs.getStringPref("general.platform.override"),
    "Win32",
    "Platform override set"
  );
  ok(
    Services.prefs
      .getStringPref("general.useragent.override")
      .startsWith("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:"),
    "User agent override set"
  );
  is(
    Services.prefs.getIntPref("dom.w3c_touch_events.enabled"),
    0,
    "Touch events disabled for a desktop preset"
  );
  for (let pref of FPP_PREFS) {
    let tokens = Services.prefs.getStringPref(pref).split(",");
    ok(
      tokens.includes("+WindowScreenXY"),
      `${pref} contains the spoofing targets`
    );
  }

  await BrowserTestUtils.withNewTab("https://example.com/", async browser => {
    // Evaluate as web content: privileged callers see the real values.
    let values = await SpecialPowers.spawn(browser, [], () =>
      JSON.parse(
        content.wrappedJSObject.eval(`JSON.stringify({
          platform: navigator.platform,
          oscpu: navigator.oscpu,
          appVersion: navigator.appVersion,
          userAgent: navigator.userAgent,
          touch: "ontouchstart" in window,
          fine: matchMedia("(pointer: fine) and (hover: hover)").matches,
          menuFont: (() => {
            let el = document.createElement("span");
            el.style.font = "menu";
            document.body.append(el);
            return getComputedStyle(el).fontFamily;
          })(),
          varyings: document
            .createElement("canvas")
            .getContext("webgl")
            ?.getParameter(0x8dfc),
          screen: [screen.width, screen.height],
          deviceWidth: matchMedia("(device-width: 1920px)").matches,
        })`)
      )
    );
    ok(
      values.userAgent.includes("(Windows NT 10.0; Win64; x64;"),
      "navigator.userAgent is spoofed"
    );
    is(values.platform, "Win32", "navigator.platform is spoofed");
    is(values.oscpu, "Windows NT 10.0; Win64; x64", "navigator.oscpu spoofed");
    is(values.appVersion, "5.0 (Windows)", "navigator.appVersion spoofed");
    ok(!values.touch, "Touch events are not exposed");
    ok(values.fine, "Fine hover-capable pointer is reported");
    ok(values.menuFont.includes("Segoe UI"), "System font is Segoe UI");
    if (values.varyings !== undefined) {
      is(values.varyings, 30, "WebGL varying limit matches ANGLE");
    }
    Assert.deepEqual(values.screen, [1920, 1080], "Screen size is spoofed");
    ok(values.deviceWidth, "CSS device-width matches the spoofed screen");
  });

  Services.prefs.setBoolPref("browser.deviceSpoofing.navigator", false);
  ok(
    !Services.prefs.prefHasUserValue("general.platform.override"),
    "Disabling a category clears its prefs"
  );
  ok(
    Services.prefs.prefHasUserValue("webgl.override-unmasked-renderer"),
    "Other categories stay applied"
  );
  Services.prefs.clearUserPref("browser.deviceSpoofing.navigator");

  Services.prefs.setStringPref(
    "browser.deviceSpoofing.gpu",
    "nvidia-rtx-3060-ti"
  );
  ok(
    Services.prefs
      .getStringPref("webgl.override-unmasked-renderer")
      .includes("RTX 3060 Ti Direct3D11"),
    "Selected GPU uses the Windows driver string"
  );
  Services.prefs.setStringPref("browser.deviceSpoofing.gpu", "custom");
  Services.prefs.setStringPref(
    "browser.deviceSpoofing.gpu.customRenderer",
    "Custom Renderer"
  );
  is(
    Services.prefs.getStringPref("webgl.override-unmasked-renderer"),
    "Custom Renderer",
    "Custom GPU renderer is used"
  );
  Services.prefs.clearUserPref("browser.deviceSpoofing.gpu");
  Services.prefs.clearUserPref("browser.deviceSpoofing.gpu.customRenderer");

  Services.prefs.setStringPref(PRESET_PREF, "android");
  is(
    Services.prefs.getStringPref("general.platform.override"),
    "Linux armv81",
    "Switching preset updates overrides"
  );
  is(
    Services.prefs.getIntPref("ui.primaryPointerCapabilities"),
    1,
    "Coarse pointer for Android"
  );

  Services.prefs.clearUserPref(PRESET_PREF);
  for (let pref of [
    "general.useragent.override",
    "webgl.override-unmasked-renderer",
    "ui.primaryPointerCapabilities",
    "layout.css.font-visibility",
    "browser.deviceSpoofing.applied",
    ...FPP_PREFS,
  ]) {
    ok(!Services.prefs.prefHasUserValue(pref), `${pref} reset when turned off`);
  }
});

add_task(async function test_foreground() {
  Services.prefs.setBoolPref("browser.deviceSpoofing.foreground", true);
  registerCleanupFunction(() =>
    Services.prefs.clearUserPref("browser.deviceSpoofing.foreground")
  );
  is(
    Services.prefs.getIntPref("dom.min_background_timeout_value"),
    4,
    "Background timers are not clamped"
  );

  let backgroundTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );
  await SpecialPowers.spawn(backgroundTab.linkedBrowser, [], () => {
    content.wrappedJSObject.eval(
      `window.events = [];
       document.addEventListener("visibilitychange", () => events.push("vis"));
       window.addEventListener("blur", () => events.push("blur"));`
    );
  });
  let otherTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.org/"
  );
  await TestUtils.waitForCondition(
    () => !backgroundTab.linkedBrowser.docShellIsActive,
    "First tab is really in the background"
  );

  let state = await SpecialPowers.spawn(backgroundTab.linkedBrowser, [], () =>
    JSON.parse(
      content.wrappedJSObject.eval(
        `JSON.stringify([document.hidden, document.visibilityState,
                         document.hasFocus(), window.events])`
      )
    )
  );
  Assert.deepEqual(
    state,
    [false, "visible", true, []],
    "Background tab looks visible and focused, without events"
  );

  BrowserTestUtils.removeTab(otherTab);
  BrowserTestUtils.removeTab(backgroundTab);
  Services.prefs.clearUserPref("browser.deviceSpoofing.foreground");
  ok(
    !Services.prefs.prefHasUserValue("dom.min_background_timeout_value"),
    "Timer clamp restored"
  );
});
