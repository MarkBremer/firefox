/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PRESETS } from "moz-src:///browser/modules/DeviceSpoofing.sys.mjs";

const PREF_BRANCH = "browser.deviceSpoofing.";

/**
 * Applies the page-level parts of device spoofing to each new document,
 * before page scripts run: WebGL limits that Gecko has no pref for, and
 * hiding that the page is in a background tab or unfocused window.
 */
export class DeviceSpoofingChild extends JSWindowActorChild {
  handleEvent() {
    if (this.document.nodePrincipal.isSystemPrincipal) {
      return;
    }
    let win = this.contentWindow;

    let preset =
      PRESETS[Services.prefs.getStringPref(PREF_BRANCH + "preset", "")];
    if (
      preset?.webglParams &&
      Services.prefs.getBoolPref(PREF_BRANCH + "graphics", true)
    ) {
      this.#patchWebGL(win, preset.webglParams);
    }
    if (Services.prefs.getBoolPref(PREF_BRANCH + "foreground", false)) {
      this.#patchForeground(win);
    }
  }

  /**
   * Replaces a method or getter on a content prototype with a chrome function
   * that looks native to the page.
   */
  #define(win, proto, name, fn, isGetter = false) {
    let exported = Cu.exportFunction(fn, win);
    Object.defineProperty(
      proto,
      name,
      isGetter
        ? { get: exported, enumerable: true, configurable: true }
        : {
            value: exported,
            writable: true,
            enumerable: true,
            configurable: true,
          }
    );
  }

  #patchWebGL(win, params) {
    for (let ctor of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
      let proto = win[ctor]?.prototype;
      if (!proto) {
        continue;
      }
      let contentProto = Cu.waiveXrays(proto);
      let original = contentProto.getParameter;
      this.#define(
        win,
        contentProto,
        "getParameter",
        function getParameter(pname) {
          if (Object.hasOwn(params, pname)) {
            return params[pname];
          }
          return original.call(this, pname);
        }
      );
    }
  }

  #patchForeground(win) {
    let docProto = Cu.waiveXrays(win.Document.prototype);
    this.#define(
      win,
      docProto,
      "hidden",
      function hidden() {
        return false;
      },
      true
    );
    this.#define(
      win,
      docProto,
      "visibilityState",
      function visibilityState() {
        return "visible";
      },
      true
    );
    this.#define(win, docProto, "hasFocus", function hasFocus() {
      return true;
    });

    // Registered before any page listener, so they run first.
    win.addEventListener(
      "visibilitychange",
      event => event.stopImmediatePropagation(),
      true
    );
    for (let type of ["blur", "focus"]) {
      win.addEventListener(
        type,
        event => {
          // Only window focus changes; element focus stays observable.
          if (event.target == event.currentTarget) {
            event.stopImmediatePropagation();
          }
        },
        true
      );
    }
  }
}
