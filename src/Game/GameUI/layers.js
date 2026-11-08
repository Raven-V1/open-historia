/*! Open Historia — the stacking order of the full-screen layers © 2026 Nicholas Krol, AGPL-3.0-or-later (see LICENSE). */
// One scale for the layers that cover the page, lowest first. A dialog that
// opens over a page (the country and difficulty pickers over Games, Scenarios
// or Community) takes the layer above it from here, not a number of its own.
export const Z_LAYER = Object.freeze({
  // The Games / Scenarios / Community pages, which cover the game.
  pageOverlay: 10046,
  // A dialog opened over a page that covers the game, above every page overlay.
  pageDialog: 10060,
  // The dialogs that start a game: the country picker and the difficulty picker.
  gameStartDialog: 10060,
  // A notification over the page and its dialogs (an import that failed).
  notice: 10070,
});
