/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PRESETS } from "moz-src:///browser/modules/DeviceSpoofing.sys.mjs";

/**
 * Reports the spoofed preset's WebGL limits to web content. Gecko has no pref
 * for these, so WebGL getParameter() is wrapped in each new window.
 */
export class DeviceSpoofingChild extends JSWindowActorChild {
  handleEvent() {
    let preset =
      PRESETS[
        Services.prefs.getStringPref("browser.deviceSpoofing.preset", "")
      ];
    let params = preset?.webglParams;
    if (
      !params ||
      !Services.prefs.getBoolPref("browser.deviceSpoofing.graphics", true) ||
      this.document.nodePrincipal.isSystemPrincipal
    ) {
      return;
    }

    let win = this.contentWindow;
    for (let ctor of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
      let proto = win[ctor]?.prototype;
      if (!proto) {
        continue;
      }
      let contentProto = Cu.waiveXrays(proto);
      let original = contentProto.getParameter;
      let getParameter = function getParameter(pname) {
        if (Object.hasOwn(params, pname)) {
          return params[pname];
        }
        return original.call(this, pname);
      };
      Object.defineProperty(contentProto, "getParameter", {
        value: Cu.exportFunction(getParameter, win),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  }
}
