# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Start a fresh Firefox with a spoofing preset and print the test page results.

Usage: ./mach python artifacts/run_wt.py [preset] [pref=value ...]
Pref names are relative to browser.deviceSpoofing. unless prefixed with "/".
"""

import os
import sys

from marionette_driver import Wait
from marionette_driver.marionette import Marionette

preset = sys.argv[1] if len(sys.argv) > 1 else "windows"
prefs = {"browser.deviceSpoofing.preset": preset}
for arg in sys.argv[2:]:
    name, _, value = arg.partition("=")
    if name.startswith("/"):
        name = name[1:]
    else:
        name = "browser.deviceSpoofing." + name
    prefs[name] = {"true": True, "false": False}.get(value, value)

m = Marionette(
    host="127.0.0.1",
    port=2829,
    bin="obj-x86_64-pc-linux-gnu/dist/bin/firefox",
    prefs=prefs,
)
m.start_session()
try:
    m.navigate(
        "file://"
        + os.path.join(os.path.dirname(os.path.abspath(__file__)), "windows-test.html")
    )
    Wait(m, timeout=20).until(
        lambda mm: mm.execute_script("return document.body.dataset.done == 'true'")
    )
    for result, table in (("result", "rows"), ("cresult", "crows"), (None, "irows")):
        if result:
            print("\n== " + m.find_element("id", result).text)
        else:
            print("\n== Device information")
        rows = m.execute_script(
            f"""
            return [...document.querySelectorAll("#{table} tr")].map(tr =>
              [...tr.cells].map(c => c.firstChild?.textContent ?? c.textContent));
            """
        )
        for r in rows:
            print(" | ".join(r))
finally:
    m.cleanup()
