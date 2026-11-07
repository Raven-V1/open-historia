/*! Open Historia — Carbon icons for the interface © 2026 Nicholas Krol, AGPL-3.0-or-later (see LICENSE). */
// The interface's own icons are IBM Carbon's (@carbon/icons-react, Apache-2.0),
// drawn in the text colour. They replace the emoji and the symbol characters
// that panels, buttons and chips used to carry. Each is imported by its own path
// so the bundle holds only the icons that are used here.
import React from "react";
import Add from "@carbon/icons-react/es/Add.js";
import Anchor from "@carbon/icons-react/es/Anchor.js";
import ArrowUpRight from "@carbon/icons-react/es/ArrowUpRight.js";
import Building from "@carbon/icons-react/es/Building.js";
import Checkmark from "@carbon/icons-react/es/Checkmark.js";
import CircleFilled from "@carbon/icons-react/es/CircleFilled.js";
import Close from "@carbon/icons-react/es/Close.js";
import Copy from "@carbon/icons-react/es/Copy.js";
import Cube from "@carbon/icons-react/es/Cube.js";
import Document from "@carbon/icons-react/es/Document.js";
import Flag from "@carbon/icons-react/es/Flag.js";
import Flash from "@carbon/icons-react/es/Flash.js";
import Location from "@carbon/icons-react/es/Location.js";
import MagicWand from "@carbon/icons-react/es/MagicWand.js";
import Map from "@carbon/icons-react/es/Map.js";
import Menu from "@carbon/icons-react/es/Menu.js";
import Music from "@carbon/icons-react/es/Music.js";
import Save from "@carbon/icons-react/es/Save.js";
import Search from "@carbon/icons-react/es/Search.js";
import StopSign from "@carbon/icons-react/es/StopSign.js";
import Time from "@carbon/icons-react/es/Time.js";
import TrashCan from "@carbon/icons-react/es/TrashCan.js";
import Warning from "@carbon/icons-react/es/Warning.js";
import Wikis from "@carbon/icons-react/es/Wikis.js";

const ICONS = {
  add: Add, anchor: Anchor, arrow: ArrowUpRight, building: Building, check: Checkmark, dot: CircleFilled,
  close: Close, copy: Copy, cube: Cube, document: Document, flag: Flag, flash: Flash, location: Location,
  ai: MagicWand, map: Map, menu: Menu, music: Music, save: Save, search: Search, stop: StopSign, time: Time,
  trash: TrashCan, warning: Warning, water: Wikis,
};

// A decorative icon that sits in a line of text. `name` is a key of ICONS.
export const UiIcon = ({ name, size = 16, style, ...rest }) => {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return <Glyph aria-hidden="true" size={size} style={{ flexShrink: 0, verticalAlign: "-0.15em", ...style }} {...rest} />;
};

export default UiIcon;
