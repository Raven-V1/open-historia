import { useSyncExternalStore } from "react";

// Device-local UI chrome only. Never feed these colors into canonical state,
// map ownership, relations, party identities or other semantic indicators.
export const UI_THEME_STORAGE_KEY = "openhistoria:ui-theme:v1";
export const DEFAULT_UI_THEME = "default";
export const UI_THEME_PRESETS = Object.freeze([
  Object.freeze({ id: "midnight", name: "Midnight Navy", colors: Object.freeze({ background: "#111D2A", surface: "#20364A", accent: "#85CBE6" }) }),
  Object.freeze({ id: "graphite", name: "Graphite", colors: Object.freeze({ background: "#15171B", surface: "#30343B", accent: "#BAC6D2" }) }),
  Object.freeze({ id: "forest", name: "Forest", colors: Object.freeze({ background: "#121E19", surface: "#283C32", accent: "#78C8A1" }) }),
  Object.freeze({ id: "oxblood", name: "Oxblood", colors: Object.freeze({ background: "#21171B", surface: "#3D2830", accent: "#DA929E" }) }),
  Object.freeze({ id: "sepia", name: "Sepia", colors: Object.freeze({ background: "#241F19", surface: "#403528", accent: "#D6B77D" }) }),
]);

// The two Carbon Design System themes (Carbon Dark = g100, Carbon Light = g10).
// They are not palettes of three colours like the presets above: their tokens
// (layers, fields, borders, text, interactive, focus) live in src/carbon/
// carbon.scss, keyed on the data-oh-ui-theme attribute this file sets, so
// choosing one sets no inline variable at all. `colors` is only what the
// picker's swatches and the preview are drawn from. They are kept apart from
// UI_THEME_PRESETS on purpose: that list is the five palettes a Custom theme
// and the contrast rules are built around.
export const CARBON_THEMES = Object.freeze([
  Object.freeze({ id: "carbon-dark", name: "Carbon Dark", scheme: "dark", colors: Object.freeze({ background: "#161616", surface: "#262626", accent: "#4589FF" }) }),
  Object.freeze({ id: "carbon-light", name: "Carbon Light", scheme: "light", colors: Object.freeze({ background: "#F4F4F4", surface: "#FFFFFF", accent: "#0F62FE" }) }),
]);
// What this fork starts on when the player has chosen nothing yet.
export const FORK_DEFAULT_UI_THEME = "carbon-dark";
const carbonTheme = (id) => CARBON_THEMES.find((item) => item.id === id);
export const isCarbonTheme = (id) => Boolean(carbonTheme(id));

const preset = (id) => UI_THEME_PRESETS.find((item) => item.id === id);
const defaultCustom = () => ({ ...preset("midnight").colors });
const textColor = "#EEF3F7";
const entries = ["background", "surface", "accent"];

export function normalizeUiColor(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (/^#[\da-f]{6}$/i.test(cleaned)) return cleaned.toUpperCase();
  if (/^#[\da-f]{3}$/i.test(cleaned)) return "#" + [...cleaned.slice(1)].map((ch) => ch + ch).join("").toUpperCase();
  return null;
}
const rgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const channel = (n) => {
  const value = n / 255;
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
};
export function uiContrastRatio(a, b) {
  const first = normalizeUiColor(a);
  const second = normalizeUiColor(b);
  if (!first || !second) return 0;
  const luminance = (color) => {
    const [r, g, b] = rgb(color).map(channel);
    return r * .2126 + g * .7152 + b * .0722;
  };
  const [light, dark] = [luminance(first), luminance(second)].sort((x, y) => y - x);
  return (light + .05) / (dark + .05);
}
export function validateUiPalette(colors) {
  if (!colors || typeof colors !== "object" || Array.isArray(colors)) return "Enter all three theme colors.";
  const normalized = Object.fromEntries(entries.map((name) => [name, normalizeUiColor(colors[name])]));
  if (entries.some((name) => !normalized[name])) return "Use six-digit hexadecimal colors.";
  if (uiContrastRatio(normalized.background, textColor) < 7 || uiContrastRatio(normalized.surface, textColor) < 7) {
    return "Background and surface are too bright for readable text.";
  }
  if (uiContrastRatio(normalized.accent, normalized.background) < 4.5
    || uiContrastRatio(normalized.accent, normalized.surface) < 4.5) {
    return "Accent needs more contrast against both backgrounds.";
  }
  return "";
}
export function normalizeUiTheme(value) {
  const selection = typeof value?.preset === "string" && (preset(value.preset) || carbonTheme(value.preset) || value.preset === "custom" || value.preset === DEFAULT_UI_THEME)
    ? value.preset : DEFAULT_UI_THEME;
  const raw = value?.custom;
  const custom = Object.fromEntries(entries.map((name) => [name, normalizeUiColor(raw?.[name]) || defaultCustom()[name]]));
  return Object.freeze({
    preset: selection,
    custom: Object.freeze(validateUiPalette(custom) ? defaultCustom() : custom),
  });
}
export function uiThemeColors(theme) {
  if (carbonTheme(theme.preset)) return carbonTheme(theme.preset).colors;
  return theme.preset === "custom" ? theme.custom : preset(theme.preset)?.colors || preset("midnight").colors;
}
const hex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0").toUpperCase();
const mix = (a, b, amount) => {
  const first = rgb(a), second = rgb(b);
  return "#" + first.map((n, index) => hex(n * (1 - amount) + second[index] * amount)).join("");
};
const translucent = (color, alpha) => `rgba(${rgb(color).join(", ")}, ${alpha})`;
export function uiThemeTokens(theme) {
  const normalized = normalizeUiTheme(theme);
  // The Carbon themes are all stylesheet (carbon.scss): no inline variable.
  if (isCarbonTheme(normalized.preset)) return {};
  if (normalized.preset === DEFAULT_UI_THEME) return {};
  const colors = uiThemeColors(normalized);
  return {
    "--oh-ui-bg": colors.background,
    "--oh-ui-surface": colors.surface,
    "--oh-ui-accent": colors.accent,
    "--oh-ui-raised": mix(colors.surface, "#FFFFFF", .055),
    "--oh-ui-header": mix(colors.background, "#000000", .32),
    "--oh-ui-active": mix(colors.surface, colors.accent, .19),
    "--oh-ui-hover": mix(colors.surface, colors.accent, .11),
    "--oh-ui-text": textColor,
    "--oh-ui-muted": "#B4C4D0",
    "--oh-ui-line": mix(colors.surface, "#9AC0D1", .26),
    "--oh-ui-focus": colors.accent,
    // Floating panels keep the map visible under the chosen palette.
    "--oh-ui-overlay": translucent(colors.background, .86),
    "--oh-ui-overlay-strong": translucent(colors.background, .94),
    "--oh-ui-overlay-card": translucent(colors.surface, .68),
    "--oh-ui-overlay-header": translucent(colors.surface, .78),
    // Existing neutral-token consumers (Actions, Projects, authoring tools);
    // never replace HUD/map, political/relationship or military colors.
    "--oh-grey-bg": colors.background,
    "--oh-grey-surface": colors.surface,
    "--oh-grey-raised": mix(colors.surface, "#FFFFFF", .055),
    "--oh-grey-selected": mix(colors.background, "#000000", .2),
    "--oh-grey-border": mix(colors.surface, "#9AC0D1", .26),
    "--oh-grey-border-strong": mix(colors.surface, "#9AC0D1", .48),
    "--oh-grey-text": textColor,
    "--oh-grey-muted": "#B4C4D0",
    "--oh-grey-faint": "#839AAA",
    // The HUD's glass (styles.css): the menu button, the session pill and Exit
    // Game, the date widget, the dock, the search field, the Advisor button and
    // the map-mode switch, tinted by the palette and still see-through. Its
    // text and its blue/amber/red signals are not chrome and stay.
    "--oh-hud-bg": translucent(colors.background, .58),
    "--oh-hud-bg-strong": translucent(colors.background, .72),
    "--oh-hud-bg-soft": translucent(colors.surface, .5),
    "--oh-hud-border": translucent(mix(colors.surface, "#FFFFFF", .55), .2),
    "--oh-hud-border-strong": translucent(mix(colors.surface, "#FFFFFF", .6), .32),
    // Buttons on the glass: resting, hovered, chosen.
    "--oh-ui-glass-pill": translucent(colors.surface, .6),
    "--oh-ui-glass-chip": translucent(mix(colors.surface, "#FFFFFF", .08), .42),
    "--oh-ui-glass-line": translucent(mix(colors.surface, "#FFFFFF", .5), .16),
    "--oh-ui-glass-hover": translucent(mix(colors.surface, colors.accent, .3), .55),
    "--oh-ui-glass-active": translucent(colors.accent, .22),
    "--oh-ui-glass-active-line": translucent(colors.accent, .45),
    "--oh-ui-glass-active-text": mix(colors.accent, "#FFFFFF", .3),
  };
}
const base = Object.freeze(normalizeUiTheme({ preset: DEFAULT_UI_THEME }));
const forkDefault = Object.freeze(normalizeUiTheme({ preset: FORK_DEFAULT_UI_THEME }));
let current = base;
let installed = false;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());
const storage = () => {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
};
const readStored = () => {
  try {
    const raw = storage()?.getItem(UI_THEME_STORAGE_KEY);
    // Nothing stored is a first visit: this fork starts on Carbon Dark. A
    // stored value that cannot be read still fails closed to the original.
    return raw ? normalizeUiTheme(JSON.parse(raw)) : forkDefault;
  } catch { return base; }
};
// Removing inline token overrides restores each panel's own authored colors,
// including existing :root neutral values. "Default" is not a new palette.
const themeTokenNames = Object.keys(uiThemeTokens({ preset: "midnight" }));
export function applyUiTheme(theme, root = typeof document !== "undefined" ? document.documentElement : null) {
  if (!root?.style) return;
  const normalized = normalizeUiTheme(theme);
  root.setAttribute("data-oh-ui-theme", normalized.preset);
  // A Carbon theme, like the original, leaves no inline override behind.
  if (isCarbonTheme(normalized.preset)) {
    for (const name of themeTokenNames) root.style.removeProperty(name);
    return;
  }
  if (normalized.preset === DEFAULT_UI_THEME) {
    for (const name of themeTokenNames) root.style.removeProperty(name);
    return;
  }
  for (const [name, value] of Object.entries(uiThemeTokens(normalized))) root.style.setProperty(name, value);
}
const update = (next, persist = true) => {
  current = normalizeUiTheme(next);
  applyUiTheme(current);
  if (persist) {
    try { storage()?.setItem(UI_THEME_STORAGE_KEY, JSON.stringify(current)); } catch { /* Works in memory when storage is unavailable. */ }
  }
  emit();
  return current;
};
export function installUiTheme() {
  if (installed) return;
  installed = true;
  update(readStored(), false);
  if (typeof window !== "undefined") window.addEventListener("storage", (event) => {
    if (event.key === UI_THEME_STORAGE_KEY || event.key === null) update(readStored(), false);
  });
}
export const getUiTheme = () => current;
export const subscribeUiTheme = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};
export const useUiTheme = () => useSyncExternalStore(subscribeUiTheme, getUiTheme, () => base);
export function selectUiTheme(id) {
  if (!preset(id) && !carbonTheme(id) && id !== "custom" && id !== DEFAULT_UI_THEME) return false;
  update({ ...current, preset: id });
  return true;
}
export function setCustomUiThemeColor(name, value) {
  if (!entries.includes(name)) return "Unknown theme color.";
  const normalized = normalizeUiColor(value);
  if (!normalized) return "Use a hexadecimal color.";
  const custom = { ...current.custom, [name]: normalized };
  const problem = validateUiPalette(custom);
  if (problem) return problem;
  update({ preset: "custom", custom });
  return "";
}
export function resetUiTheme() {
  update({ preset: DEFAULT_UI_THEME, custom: defaultCustom() });
}
// "Reset to default" in Settings: this fork's own default, Carbon Dark, with the
// Custom colours put back. resetUiTheme (above) is the original interface.
export function resetUiThemeToForkDefault() {
  update({ preset: FORK_DEFAULT_UI_THEME, custom: defaultCustom() });
}
// The Dark / Light switch (Settings → General, the main menu's rail). It uses
// the same selection as the picker, so there is one mechanism. From any other
// theme it goes to Carbon Dark first: a player who chose Sepia has not asked
// for Light, and one press of the switch should land on a Carbon theme.
export function toggleCarbonScheme() {
  return selectUiTheme(current.preset === "carbon-dark" ? "carbon-light" : "carbon-dark");
}
