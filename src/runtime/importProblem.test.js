/*! Open Historia — import problem tests © 2026 Nicholas Krol, AGPL-3.0-or-later (see LICENSE). */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { describeImportProblem } from "./importProblem.js";

const library = fs.readFileSync(new URL("../Game/GameUI/libraryBar.jsx", import.meta.url), "utf8");

test("a file that is not JSON is called invalid JSON, not shown as a parser message", () => {
  let thrown;
  try { JSON.parse("not json at all"); } catch (error) { thrown = error; }
  const problem = describeImportProblem(thrown, "scenario");
  assert.equal(problem.title, "That is not a valid scenario file");
  assert.match(problem.detail, /not valid JSON/);
  assert.doesNotMatch(problem.detail, /Unexpected token/);
  assert.equal(describeImportProblem(thrown, "game").title, "That is not a valid game file");
});

test("JSON that fails the schema check says it is not a scenario", () => {
  const problem = describeImportProblem(new Error("Unsupported scenario bundle."), "scenario");
  assert.equal(problem.title, "That file is not a scenario");
  assert.match(problem.detail, /Export Scenario/);
});

test("the wrong kind of game file and a zip without its parts are named", () => {
  const wrong = describeImportProblem(new Error("That file isn't a game export. Pick the .zip you saved with Export."), "game");
  assert.equal(wrong.title, "That is not a game export");
  const missing = describeImportProblem(new Error("That .zip is missing scenario.json."), "scenario");
  assert.equal(missing.title, "That .zip is not a scenario export");
  assert.match(describeImportProblem(new Error("End of central directory not found"), "game").title, /could not be opened/);
});

test("anything else keeps its message under a plain title", () => {
  const problem = describeImportProblem(new Error("disk full"), "scenario");
  assert.equal(problem.title, "The scenario could not be imported");
  assert.equal(problem.detail, "disk full");
});

test("both imports report a failure on the page, in a Carbon error notification", () => {
  for (const handler of ["handleImportGameFile", "handleImportScenarioFile"]) {
    const start = library.indexOf(`const ${handler} = async`);
    const body = library.slice(start, library.indexOf("\n  };\n", start));
    assert.match(body, /setImportProblem\(describeImportProblem\(/, `${handler} shows the problem`);
  }
  assert.match(library, /<CarbonToastNotification[\s\S]*?kind="error"/);
});
