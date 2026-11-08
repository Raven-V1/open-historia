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
import Chat from "@carbon/icons-react/es/Chat.js";
import NotificationFilled from "@carbon/icons-react/es/NotificationFilled.js";
import VolumeUp from "@carbon/icons-react/es/VolumeUp.js";
import VolumeMute from "@carbon/icons-react/es/VolumeMute.js";
import Pen from "@carbon/icons-react/es/Pen.js";
import View from "@carbon/icons-react/es/View.js";
import UserAvatar from "@carbon/icons-react/es/UserAvatar.js";
import Task from "@carbon/icons-react/es/Task.js";
import Radar from "@carbon/icons-react/es/Radar.js";
import Target from "@carbon/icons-react/es/Target.js";
import Email from "@carbon/icons-react/es/Email.js";
import Compass from "@carbon/icons-react/es/Compass.js";
import ChartLine from "@carbon/icons-react/es/ChartLine.js";
import ChartBar from "@carbon/icons-react/es/ChartBar.js";
import Group from "@carbon/icons-react/es/Group.js";
import Partnership from "@carbon/icons-react/es/Partnership.js";
import Trophy from "@carbon/icons-react/es/Trophy.js";
import Settings from "@carbon/icons-react/es/Settings.js";
import UserMilitary from "@carbon/icons-react/es/UserMilitary.js";
import Catalog from "@carbon/icons-react/es/Catalog.js";
import Link from "@carbon/icons-react/es/Link.js";
import Locked from "@carbon/icons-react/es/Locked.js";
import Plane from "@carbon/icons-react/es/Plane.js";
import Tools from "@carbon/icons-react/es/Tools.js";
import Rocket from "@carbon/icons-react/es/Rocket.js";
import Scales from "@carbon/icons-react/es/Scales.js";
import Folder from "@carbon/icons-react/es/Folder.js";
import Edit from "@carbon/icons-react/es/Edit.js";
import Microscope from "@carbon/icons-react/es/Microscope.js";
import ThumbsUp from "@carbon/icons-react/es/ThumbsUp.js";
import Pin from "@carbon/icons-react/es/Pin.js";
import Download from "@carbon/icons-react/es/Download.js";
import CircleOutline from "@carbon/icons-react/es/CircleOutline.js";
import FaceCool from "@carbon/icons-react/es/FaceCool.js";
import FaceSatisfied from "@carbon/icons-react/es/FaceSatisfied.js";
import FaceDissatisfied from "@carbon/icons-react/es/FaceDissatisfied.js";
import Fire from "@carbon/icons-react/es/Fire.js";
import FaceDizzy from "@carbon/icons-react/es/FaceDizzy.js";
import StarFilled from "@carbon/icons-react/es/StarFilled.js";
import Help from "@carbon/icons-react/es/Help.js";
import Renew from "@carbon/icons-react/es/Renew.js";
import WarningAlt from "@carbon/icons-react/es/WarningAlt.js";
import Policy from "@carbon/icons-react/es/Policy.js";
import Code from "@carbon/icons-react/es/Code.js";
import Terminal from "@carbon/icons-react/es/Terminal.js";
import Events from "@carbon/icons-react/es/Events.js";
import Debug from "@carbon/icons-react/es/Debug.js";
import SettingsAdjust from "@carbon/icons-react/es/SettingsAdjust.js";
import Grid from "@carbon/icons-react/es/Grid.js";
import Table from "@carbon/icons-react/es/Table.js";
import ColumnDependency from "@carbon/icons-react/es/ColumnDependency.js";
import Upload from "@carbon/icons-react/es/Upload.js";
import ChevronRight from "@carbon/icons-react/es/ChevronRight.js";
import ChevronLeft from "@carbon/icons-react/es/ChevronLeft.js";

const ICONS = {
  add: Add, anchor: Anchor, arrow: ArrowUpRight, building: Building, check: Checkmark, dot: CircleFilled,
  close: Close, copy: Copy, cube: Cube, document: Document, flag: Flag, flash: Flash, location: Location,
  ai: MagicWand, map: Map, menu: Menu, music: Music, save: Save, search: Search, stop: StopSign, time: Time,
  trash: TrashCan, warning: Warning, water: Wikis,
  chat: Chat,
  bell: NotificationFilled,
  volume: VolumeUp,
  mute: VolumeMute,
  pen: Pen,
  spy: View,
  user: UserAvatar,
  task: Task,
  radar: Radar,
  target: Target,
  email: Email,
  compass: Compass,
  chart: ChartLine,
  bars: ChartBar,
  group: Group,
  partner: Partnership,
  trophy: Trophy,
  settings: Settings,
  military: UserMilitary,
  catalog: Catalog,
  link: Link,
  lock: Locked,
  plane: Plane,
  tools: Tools,
  rocket: Rocket,
  scales: Scales,
  folder: Folder,
  edit: Edit,
  science: Microscope,
  like: ThumbsUp,
  pin: Pin,
  download: Download,
  upload: Upload,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  ring: CircleOutline,
  faceCool: FaceCool,
  faceEasy: FaceSatisfied,
  faceHard: FaceDissatisfied,
  fire: Fire,
  faceDizzy: FaceDizzy,
  star: StarFilled,
  help: Help,
  renew: Renew,
  alert: WarningAlt,
  policy: Policy,
  code: Code,
  terminal: Terminal,
  events: Events,
  debug: Debug,
  adjust: SettingsAdjust,
  grid: Grid,
  table: Table,
  columns: ColumnDependency,
};

// A decorative icon that sits in a line of text. `name` is a key of ICONS.
export const UiIcon = ({ name, size = 16, style, ...rest }) => {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return <Glyph aria-hidden="true" size={size} style={{ flexShrink: 0, verticalAlign: "-0.15em", ...style }} {...rest} />;
};

// The icon of each difficulty level, in place of the level's emoji (which stays
// in the level's data: only the interface stops showing it).
const DIFFICULTY_ICONS = { "very-easy": "faceCool", easy: "faceEasy", medium: "scales", hard: "faceHard", "very-hard": "fire", impossible: "faceDizzy" };
export const DifficultyIcon = ({ id, size = 24, ...rest }) => <UiIcon name={DIFFICULTY_ICONS[id] || "scales"} size={size} {...rest} />;

export default UiIcon;
