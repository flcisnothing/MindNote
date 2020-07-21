const EDGE = {
  TOP: "top",
  RIGHT: "right",
  BOTTOM: "bottom",
  LEFT: "left",
};

const CURVE_IN_OUT = {
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

const NODE_POINT_TYPE = {
  TOP_LEFT: "topLeft",
  TOP_RIGHT: "topRight",
  BOTTOM_RIGHT: "bottomRight",
  BOTTOM_LEFT: "bottomLeft",
};

const LIST_ACTION_TYPE = {
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

export {
  LIST_ACTION_TYPE,
  EDGE,
  CURVE_IN_OUT,
  CLOCKFACE,
  CURVE_CONTROL_TYPE,
  CURVE_POINT_TYPE,
  NODE_POINT_TYPE,
  SHOW_TOOL_TYPE,
  TOOL_TYPE,
  ITEM_TYPE,
};
