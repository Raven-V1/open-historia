/*! Open Historia — what a failed import tells the player © 2026 Nicholas Krol, AGPL-3.0-or-later (see LICENSE). */
// Import Game and Import Scenario read a file the player picked, which can be
// anything. Whatever goes wrong becomes one title and one sentence a player can
// act on: the wrong kind of file, a file that is not valid JSON, or a file that
// is JSON but not an Open Historia export (failed validation).
const GAME = "game";

export const describeImportProblem = (error, kind = "scenario") => {
  const message = String(error?.message ?? error ?? "").trim();
  const isGame = kind === GAME;

  // JSON.parse failed: a text file that is not JSON, or JSON with a typo; a
  // picture or a document ends up here too, since it is read as text.
  if (error instanceof SyntaxError || /JSON/i.test(message) && /(unexpected|position|parse|valid)/i.test(message)) {
    return {
      title: isGame ? "That is not a valid game file" : "That is not a valid scenario file",
      detail: isGame
        ? "The file is not valid JSON, or it is not an Open Historia export at all. Pick the .zip you saved with Export."
        : "The file is not valid JSON, or it is not an Open Historia export at all. Pick the .zip or .json you saved with Export Scenario.",
    };
  }
  // The file parsed but is not a scenario: the schema check refused it.
  if (/unsupported scenario bundle/i.test(message)) {
    return {
      title: "That file is not a scenario",
      detail: "It is readable, but it is not an Open Historia scenario, or it comes from a version this game cannot read. Pick a file saved with Export Scenario, or a scenario .zip from the Community tab.",
    };
  }
  if (/isn.t a game export/i.test(message)) {
    return { title: "That is not a game export", detail: message };
  }
  if (/missing (game|scenario)\.json/i.test(message)) {
    return { title: isGame ? "That .zip is not a game export" : "That .zip is not a scenario export", detail: message };
  }
  if (/zip|archive|central directory|end of/i.test(message)) {
    return { title: "That .zip could not be opened", detail: "It looks damaged or incomplete. Export it again and retry." };
  }
  return { title: isGame ? "The game could not be imported" : "The scenario could not be imported", detail: message || "Something went wrong reading the file." };
};
