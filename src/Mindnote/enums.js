const EDGE = {
  TOP: "top",
  RIGHT: "right",
  BOTTOM: "bottom",
  LEFT: "left",
};

const CURVE_DIRECTION = {
  IN: "in",
  OUT: "out",
};

const CLOCKFACE = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
  NINE: 9,
  TEN: 10,
  ELEVEN: 11,
  TWELVE: 12,
};

const CURVE_CONTROL_TYPE = {
  START_CONTROL: "startControl",
  END_CONTROL: "endControl",
};

const CURVE_POINT_TYPE = {
  START: "start",
  END: "end",
};

const CURVE_MOVE_TYPE = {
  MOVE_START: "MOVE_START",
  MOVE_END: "MOVE_END",
  MOVE_BOTH: "MOVE_BOTH",
};

const NODE_POINT_TYPE = {
  TOP_LEFT: "topLeft",
  TOP_RIGHT: "topRight",
  BOTTOM_RIGHT: "bottomRight",
  BOTTOM_LEFT: "bottomLeft",
};

const LIST_ACTION_TYPE = {
  INIT_ITEMS: "INIT_ITEMS",
  ADD_ITEMS: "ADD_ITEMS",
  UPDATE_ITEMS: "UPDATE_ITEMS",
  DELETE_ITEMS: "DELETE_ITEMS",
};

const SHOW_TOOL_TYPE = {
  SHOW_NODE_TOOL: "SHOW_NODE_TOOL",
  SHOW_CURVE_TOOL: "SHOW_CURVE_TOOL",
  SHOW_NOTE: "SHOW_NOTE",
  CLOSE_NODE_TOOL: "CLOSE_NODE_TOOL",
  CLOSE_CURVE_TOOL: "CLOSE_CURVE_TOOL",
  CLOSE_NOTE: "CLOSE_NOTE",
  CLOSE_ALL: "CLOSE_ALL",
};

const TOOL_TYPE = {
  NODE_TOOL: "NODE_TOOL",
  CURVE_TOOL: "CURVE_TOOL",
  NOTE: "NOTE",
};

const ITEM_TYPE = {
  NODE: "NODE",
  CURVE: "CURVE",
  SVG: "SVG",
};

const DRAG_TYPE = {
  MOVE_CANVAS: "MOVE_CANVAS",
  DRAW_NEW_NODE: "DRAW_NEW_NODE",
  MODIFY_CURVE_CONTROL: "MODIFY_CURVE_CONTROL",
  MOVE_CURVE: "MOVE_CURVE",
  MOVE_NODE: "MOVE_NODE",
  RESIZE_NODE: "RESIZE_NODE",
};

const NOTE_MODE = {
  VIEW_MODE: "VIEW_MODE",
  EDIT_MODE: "EDIT_MODE",
};

export {
  LIST_ACTION_TYPE,
  EDGE,
  CURVE_DIRECTION,
  CLOCKFACE,
  CURVE_CONTROL_TYPE,
  CURVE_POINT_TYPE,
  CURVE_MOVE_TYPE,
  NODE_POINT_TYPE,
  SHOW_TOOL_TYPE,
  TOOL_TYPE,
  ITEM_TYPE,
  DRAG_TYPE,
  NOTE_MODE,
};
