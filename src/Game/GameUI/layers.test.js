/*! Open Historia — layer order tests © 2026 Nicholas Krol, AGPL-3.0-or-later (see LICENSE). */
// The difficulty picker is Carbon's Modal, whose own layer is below the
// Games / Scenarios / Community pages. Choosing a country then opened it
// behind the page, and nothing appeared to happen.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Z_LAYER } from "./layers.js";

const library = fs.readFileSync(new URL("./libraryBar.jsx", import.meta.url), "utf8");

test("game-start dialogs sit above the page overlays", () => {
  assert.ok(Z_LAYER.gameStartDialog > Z_LAYER.pageOverlay);
});

test("the pages and both pickers take their layer from the shared scale", () => {
  assert.match(library, /zIndex: Z_LAYER\.pageOverlay,/);
  assert.match(library, /inset: 0, zIndex: Z_LAYER\.gameStartDialog,/);
  assert.match(library, /className="oh-difficulty-modal"\s*style=\{\{ zIndex: Z_LAYER\.gameStartDialog \}\}/);
  assert.doesNotMatch(library, /zIndex: 10046|zIndex: 10060/);
});
