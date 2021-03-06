import React, { useState, useEffect, useContext, useRef } from "react";
import { v4 as uuid } from "uuid";
import StyleContext from "../StyleContext";
import ItemContext from "../ItemContext";
import VirtualNode from "./VirtualNode";
import SelectedNode from "./SelectedNode";
import ViewNode from "./ViewNode";
import Node from "./Node";
import VirtualCurve from "./VirtualCurve";
import SelectedCurve from "./SelectedCurve";
import ViewCurve from "./ViewCurve";
import Curve from "./Curve";
import {
  EDGE,
  CURVE_DIRECTION,
  LIST_ACTION_TYPE,
  ITEM_TYPE,
  DRAG_TYPE,
  CLOCKFACE,
  CURVE_POINT_TYPE,
  CURVE_CONTROL_TYPE,
  CURVE_MOVE_TYPE,
  NODE_POINT_TYPE,
  MINDNOTE_MODE,
} from "../utils/enums";
import {
  calcIntersectionPoint,
  calcCenterPoint,
  calcPointsDistance,
  calcOffset,
  calcMovingPoint,
} from "../utils/math";

// prevent browser default zooming action
document.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  },
  {
    passive: false,
  }
);

const SVG = (props) => {
  // SVG
  const convertToSVGCoord = ({ x, y }) => {
    const clientPoint = SVGRef.current.createSVGPoint();
    clientPoint.x = x;
    clientPoint.y = y;
    const CTM = SVGRef.current.getScreenCTM();
    const SVGPoint = clientPoint.matrixTransform(CTM.inverse());
    return { x: SVGPoint.x, y: SVGPoint.y };
  };
  const SVGRef = useRef(null);
  const [SVGSize, setSVGSize] = useState({
    width: 960,
    height: 540,
  });
  const [viewBoxOrigin, setViewBoxOrigin] = useState({ x: 0, y: 0 });

  // nodeList, curveList, selectedItem
  const {
    nodeList,
    curveList,
    noteList,
    selectedItem,
    nodeToBeDeleted,
    setNodeToBeDeleted,
    SVGSizeRatio,
    resizeCanvas,
  } = props;
  // Style
  const { defaultNodeStyle, curvePointStyle } = useContext(StyleContext);
  // Item method
  const {
    dispatchNodes,
    getNode,
    dispatchCurves,
    getCurve,
    dispatchNotes,
    setSelectedItem,
  } = useContext(ItemContext);

  // Node
  const calcNodeCorners = (center, width, height) => {
    const halfWidth = 0.5 * width;
    const halfHeight = 0.5 * height;
    return {
      topLeft: { x: center.x - halfWidth, y: center.y - halfHeight },
      topRight: { x: center.x + halfWidth, y: center.y - halfHeight },
      bottomRight: { x: center.x + halfWidth, y: center.y + halfHeight },
      bottomLeft: { x: center.x - halfWidth, y: center.y + halfHeight },
    };
  };
  const calcNodeEdgeCenters = (topLeft, topRight, bottomRight, bottomLeft) => {
    return {
      topCenter: calcCenterPoint(topLeft, topRight),
      rightCenter: calcCenterPoint(topRight, bottomRight),
      bottomCenter: calcCenterPoint(bottomRight, bottomLeft),
      leftCenter: calcCenterPoint(bottomLeft, topLeft),
    };
  };
  const calcNodeEdgeConnections = (
    topCenter,
    rightCenter,
    bottomCenter,
    leftCenter,
    offset
  ) => {
    return {
      topConnection: { x: topCenter.x, y: topCenter.y - offset },
      rightConnection: { x: rightCenter.x + offset, y: rightCenter.y },
      bottomConnection: { x: bottomCenter.x, y: bottomCenter.y + offset },
      leftConnection: { x: leftCenter.x - offset, y: leftCenter.y },
    };
  };
  const calcNodeCoord = (center, width, height) => {
    const corners = calcNodeCorners(center, width, height);
    const { topLeft, topRight, bottomRight, bottomLeft } = corners;
    const edgeCenters = calcNodeEdgeCenters(
      topLeft,
      topRight,
      bottomRight,
      bottomLeft
    );
    const { topCenter, rightCenter, bottomCenter, leftCenter } = edgeCenters;
    const offset = curvePointStyle.r;
    const connections = calcNodeEdgeConnections(
      topCenter,
      rightCenter,
      bottomCenter,
      leftCenter,
      offset
    );
    return {
      corners,
      edgeCenters,
      connections,
    };
  };
  const defaultNodeWidth = 120;
  const defaultNodeHeight = 40;
  const createNode = ({
    id = null,
    noteId = null,
    level = null,
    title = "",
    center,
    width = defaultNodeStyle.width,
    height = defaultNodeStyle.height,
    style = null,
    parentNodeId = null,
    upstreamCurveId = null,
    childNodesId = [],
    downstreamCurvesId = [],
    top = {
      direction: null,
      nodesId: [],
      curvesId: [],
    },
    right = {
      direction: null,
      nodesId: [],
      curvesId: [],
    },
    bottom = {
      direction: null,
      nodesId: [],
      curvesId: [],
    },
    left = {
      direction: null,
      nodesId: [],
      curvesId: [],
    },
  } = {}) => {
    const { corners, edgeCenters, connections } = calcNodeCoord(
      center,
      width,
      height
    );
    return {
      id,
      noteId,
      level,
      title,
      center,
      width,
      height,
      corners,
      edgeCenters,
      connections,
      style,
      parentNodeId,
      upstreamCurveId,
      childNodesId,
      downstreamCurvesId,
      top,
      right,
      bottom,
      left,
    };
  };
  const createNote = (nodeId) => {
    return { id: uuid(), nodeId, title: "", content: "" };
  };
  const setNodeCurveRelation = (
    actionType,
    parentNode,
    childNode,
    curve,
    startEdge,
    endEdge
  ) => {
    let parentNodeRelationData, childNodeRelationData, curveRelationData;
    switch (actionType) {
      case "ADD":
        parentNodeRelationData = {
          childNodesId: parentNode.childNodesId.includes(childNode.id)
            ? parentNode.childNodesId
            : [...parentNode.childNodesId, childNode.id],
          downstreamCurvesId: parentNode.downstreamCurvesId.includes(curve.id)
            ? parentNode.downstreamCurvesId
            : [...parentNode.downstreamCurvesId, curve.id],
          [startEdge]: {
            direction: CURVE_DIRECTION.OUT,
            nodesId: parentNode[startEdge].nodesId.includes(childNode.id)
              ? parentNode[startEdge].nodesId
              : [...parentNode[startEdge].nodesId, childNode.id],
            curvesId: parentNode[startEdge].curvesId.includes(curve.id)
              ? parentNode[startEdge].curvesId
              : [...parentNode[startEdge].curvesId, curve.id],
          },
        };
        childNodeRelationData = {
          parentNodeId: parentNode.id,
          upstreamCurveId: curve.id,
          [endEdge]: {
            direction: CURVE_DIRECTION.IN,
            nodesId: [parentNode.id],
            curvesId: [curve.id],
          },
        };
        curveRelationData = {
          startNodeId: parentNode.id,
          endNodeId: childNode.id,
          startEdge,
          endEdge,
        };
        break;
      case "REMOVE":
        parentNodeRelationData = {
          childNodesId: parentNode.childNodesId.filter(
            (childNodeId) => childNodeId !== childNode.id
          ),
          downstreamCurvesId: parentNode.downstreamCurvesId.filter(
            (downstreamCurveId) => downstreamCurveId !== curve.id
          ),
          [startEdge]: {
            direction:
              parentNode[startEdge].nodesId.length === 1
                ? null
                : parentNode[startEdge].direction,
            nodesId: parentNode[startEdge].nodesId.filter(
              (nodeId) => nodeId !== childNode.id
            ),
            curvesId: parentNode[startEdge].curvesId.filter(
              (curveId) => curveId !== curve.id
            ),
          },
        };
        childNodeRelationData = {
          parentNodeId: null,
          upstreamCurveId: null,
          [endEdge]: {
            direction: null,
            nodesId: [],
            curvesId: [],
          },
        };
        curveRelationData = {
          startNodeId: null,
          endNodeId: null,
          startEdge: null,
          endEdge: null,
        };
        break;
      default:
        throw new Error(
          "You have to provide the action of Node and Curve relation!"
        );
    }
    return {
      parentNodeRelationData,
      childNodeRelationData,
      curveRelationData,
    };
  };
  const getDecendents = (nodeId) => {
    const node = getNode(nodeId);
    if (node.childNodesId.length === 0) return [];
    return node.childNodesId.reduce(
      (decendents, childNodeId) => [
        ...decendents,
        ...getDecendents(childNodeId),
        childNodeId,
      ],
      []
    );
  };
  // Virtual Node
  const [virtualNode, setVirtualNode] = useState(null);

  // Curve
  const calcCurveControl = (start, end) => {
    const directionVector = { a: end.x - start.x, b: end.y - start.y };
    const startFraction = 0.4;
    const endFraction = 0.6;
    const startOffset = {
      dx: directionVector.a * startFraction,
      dy: directionVector.b * startFraction,
    };
    const endOffset = {
      dx: directionVector.a * endFraction,
      dy: directionVector.b * endFraction,
    };
    let startControl = {
      x: start.x + startOffset.dx,
      y: start.y + startOffset.dy,
    };
    let endControl = { x: start.x + endOffset.dx, y: start.y + endOffset.dy };
    return { startControl, endControl };
  };
  const createCurve = ({
    id = null,
    level = null,
    start,
    end,
    startNodeId = null,
    endNodeId = null,
    startEdge = null,
    endEdge = null,
    style = null,
  } = {}) => {
    const { startControl, endControl } = calcCurveControl(start, end);
    return {
      id,
      level,
      start,
      end,
      startControl,
      endControl,
      startNodeId,
      endNodeId,
      startEdge,
      endEdge,
      style,
    };
  };
  const getDownstreamCurves = (nodeId) => {
    const node = getNode(nodeId);
    if (node.downstreamCurvesId.length === 0) return [];
    return [
      ...node.downstreamCurvesId,
      ...node.childNodesId.reduce(
        (downstreamCurves, childNodeId) => [
          ...downstreamCurves,
          ...getDownstreamCurves(childNodeId),
        ],
        []
      ),
    ];
  };
  // Virtual Curve
  const [virtualCurve, setVirtualCurve] = useState(null);

  // Mindnote Mode
  const { mindnoteMode } = props;
  // Selected Node
  const [selectedNode, setSelectedNode] = useState(null);
  // View Node
  const [viewNode, setViewNode] = useState(null);
  // Show Selected Node or View Node based on mindnoteMode
  useEffect(() => {
    if (selectedItem && selectedItem.type === ITEM_TYPE.NODE) {
      switch (mindnoteMode) {
        case MINDNOTE_MODE.EDIT_MODE:
          setSelectedNode(getNode(selectedItem.id));
          break;
        case MINDNOTE_MODE.VIEW_MODE:
          setViewNode(getNode(selectedItem.id));
        default:
          break;
      }
    } else {
      setSelectedNode(null);
      setViewNode(null);
    }
  }, [selectedItem, nodeList]);
  // Selected Curve
  const [selectedCurve, setSelectedCurve] = useState(null);
  // View Curve
  const [viewCurve, setViewCurve] = useState(null);
  // Show Selected Curve or View Curve based on mindnoteMode
  useEffect(() => {
    if (selectedItem && selectedItem.type === ITEM_TYPE.CURVE) {
      switch (mindnoteMode) {
        case MINDNOTE_MODE.EDIT_MODE:
          setSelectedCurve(getCurve(selectedItem.id));
          break;
        case MINDNOTE_MODE.VIEW_MODE:
          setViewCurve(getCurve(selectedItem.id));
        default:
          break;
      }
    } else {
      setSelectedCurve(null);
      setViewCurve(null);
    }
  }, [selectedItem, curveList]);
  // Initialize Canvas
  useEffect(() => {
    // Create Center Node if no nodeList Data
    if (
      SVGSize.height !== 0 &&
      SVGSize.width !== 0 &&
      (nodeList.length === 0 || noteList.length === 0)
    ) {
      const center = {
        x: 0.5 * SVGSize.width,
        y: 0.5 * SVGSize.height,
      };
      const centerNodeId = uuid();
      const centerNote = createNote(centerNodeId);
      const centerNode = createNode({
        id: centerNodeId,
        noteId: centerNote.id,
        level: 0,
        center,
      });
      dispatchNodes({ type: LIST_ACTION_TYPE.INIT_ITEMS, items: [centerNode] });
      dispatchNotes({ type: LIST_ACTION_TYPE.INIT_ITEMS, items: [centerNote] });
    }
  }, [SVGSize, nodeList]);

  // Move Canvas
  const moveCanvas = () => setDragType(DRAG_TYPE.MOVE_CANVAS);

  // Draw new Node
  const [currentStartNode, setCurrentStartNode] = useState(null);
  const [currentStartEdge, setCurrentStartEdge] = useState(null);
  const calcCurveConnections = (startNode, endNode) => {
    const topIntersect = calcIntersectionPoint(
      startNode.center,
      endNode.center,
      startNode.corners.topLeft,
      startNode.corners.topRight
    );
    const rightIntersect = calcIntersectionPoint(
      startNode.center,
      endNode.center,
      startNode.corners.topRight,
      startNode.corners.bottomRight
    );
    const bottomIntersect = calcIntersectionPoint(
      startNode.center,
      endNode.center,
      startNode.corners.bottomRight,
      startNode.corners.bottomLeft
    );
    const leftIntersect = calcIntersectionPoint(
      startNode.center,
      endNode.center,
      startNode.corners.bottomLeft,
      startNode.corners.topLeft
    );
    let curveDirection;
    // CLOCKFACE
    if (topIntersect) {
      curveDirection =
        topIntersect.x < startNode.center.x ? CLOCKFACE.ELEVEN : CLOCKFACE.ONE;
    } else if (rightIntersect) {
      curveDirection =
        rightIntersect.y < startNode.center.y ? CLOCKFACE.TWO : CLOCKFACE.FOUR;
    } else if (bottomIntersect) {
      curveDirection =
        bottomIntersect.x < startNode.center.x
          ? CLOCKFACE.SEVEN
          : CLOCKFACE.FIVE;
    } else if (leftIntersect) {
      curveDirection =
        leftIntersect.y < startNode.center.y ? CLOCKFACE.TEN : CLOCKFACE.EIGHT;
    } else {
      curveDirection = null;
    }
    let start;
    let end;
    let startEdge;
    let endEdge;
    switch (curveDirection) {
      case CLOCKFACE.ELEVEN:
      case CLOCKFACE.ONE:
        start = startNode.connections.topConnection;
        end = endNode.connections.bottomConnection;
        startEdge = EDGE.TOP;
        endEdge = EDGE.BOTTOM;
        break;
      case CLOCKFACE.TWO:
      case CLOCKFACE.FOUR:
        start = startNode.connections.rightConnection;
        end = endNode.connections.leftConnection;
        startEdge = EDGE.RIGHT;
        endEdge = EDGE.LEFT;
        break;
      case CLOCKFACE.FIVE:
      case CLOCKFACE.SEVEN:
        start = startNode.connections.bottomConnection;
        end = endNode.connections.topConnection;
        startEdge = EDGE.BOTTOM;
        endEdge = EDGE.TOP;
        break;
      case CLOCKFACE.EIGHT:
      case CLOCKFACE.TEN:
        start = startNode.connections.leftConnection;
        end = endNode.connections.rightConnection;
        startEdge = EDGE.LEFT;
        endEdge = EDGE.RIGHT;
        break;
      default:
        start = startNode.center;
        end = endNode.center;
        startEdge = null;
        endEdge = null;
        break;
    }
    return { start, end, startEdge, endEdge };
  };
  const drawNewNode = (e, startNodeId, startEdge) => {
    // Get Start Node
    const startNode = getNode(startNodeId);
    // If edge is not in, then draw a new node
    if (startNode[startEdge].direction !== CURVE_DIRECTION.IN) {
      setDragType(DRAG_TYPE.DRAW_NEW_NODE);
      setCurrentStartNode(startNode);
      setCurrentStartEdge(startEdge);
      // Set End Node
      const endCenter = convertToSVGCoord({ x: e.clientX, y: e.clientY });
      const endNode = createNode({
        level: startNode.level + 1, // provide level for getting style
        center: endCenter,
      });
      // Get Curve Connection
      const curveConnection = calcCurveConnections(startNode, endNode);
      // Set Curve
      const virtualCurve = createCurve({
        start: curveConnection.start,
        end: curveConnection.end,
      });
      // Set Virtual Node and Virtual Curve
      setVirtualNode(endNode);
      setVirtualCurve(virtualCurve);
    }
  };

  // Modify Curve Control
  const [currentCurveControlType, setCurrentCurveControlType] = useState(null);
  const modifyCurveControl = (e, curveId, controlType) => {
    if (
      selectedItem &&
      selectedItem.type === ITEM_TYPE.CURVE &&
      selectedItem.id === curveId
    ) {
      setDragType(DRAG_TYPE.MODIFY_CURVE_CONTROL);
      setCurrentCurveControlType(controlType);
      const virtualCurve = { ...getCurve(selectedItem.id) };
      setVirtualCurve(virtualCurve);
    }
  };

  // Move Curve manually
  const [currentCurvePointType, setCurrentCurvePointType] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const hoverNode = (nodeId) => setHoveredNode(getNode(nodeId));
  const unHoverNode = () => setHoveredNode(null);
  const clacMinDistanceEdge = (newCurvePoint, newConnectionNode) => {
    const curveToEdge = [
      {
        edge: EDGE.TOP,
        d: calcPointsDistance(
          newCurvePoint,
          newConnectionNode.edgeCenters[`${EDGE.TOP}Center`]
        ),
      },
      {
        edge: EDGE.RIGHT,
        d: calcPointsDistance(
          newCurvePoint,
          newConnectionNode.edgeCenters[`${EDGE.RIGHT}Center`]
        ),
      },
      {
        edge: EDGE.BOTTOM,
        d: calcPointsDistance(
          newCurvePoint,
          newConnectionNode.edgeCenters[`${EDGE.BOTTOM}Center`]
        ),
      },
      {
        edge: EDGE.LEFT,
        d: calcPointsDistance(
          newCurvePoint,
          newConnectionNode.edgeCenters[`${EDGE.LEFT}Center`]
        ),
      },
    ];
    const minDistanceEdge = curveToEdge.reduce((prev, current) =>
      current.d < prev.d ? current : prev
    );

    return minDistanceEdge.edge;
  };
  const moveCurve = (e, curveId, pointType) => {
    if (
      selectedItem &&
      selectedItem.type === ITEM_TYPE.CURVE &&
      selectedItem.id === curveId
    ) {
      setDragType(DRAG_TYPE.MOVE_CURVE);
      setCurrentCurvePointType(pointType);
      const virtualCurve = { ...getCurve(selectedItem.id) };
      setVirtualCurve(virtualCurve);
    }
  };

  // Delete Node (and its childNodes/downstreamCueves)
  const deleteNode = (nodeId) => {
    const node = getNode(nodeId);
    // Selected Node is not the Center Node
    if (!node.parentNodeId) {
      console.log("Center Node can not be deleted!");
    } else {
      const upstreamCurve = getCurve(node.upstreamCurveId);
      const parentNode = getNode(node.parentNodeId);

      const { parentNodeRelationData } = setNodeCurveRelation(
        "REMOVE",
        parentNode,
        node,
        upstreamCurve,
        upstreamCurve.startEdge,
        upstreamCurve.endEdge
      );
      // Update Parent Node's childNodes and DownstreamCurves
      const newParentNode = { ...parentNode, ...parentNodeRelationData };
      dispatchNodes({
        type: LIST_ACTION_TYPE.UPDATE_ITEMS,
        items: [newParentNode],
      });
      // Delete Nodes
      const nodesToBeRemoved = [nodeId, ...getDecendents(nodeId)];
      dispatchNodes({
        type: LIST_ACTION_TYPE.DELETE_ITEMS,
        items: [...nodesToBeRemoved],
      });
      // Delete Notes
      const notesToBeRemoved = nodesToBeRemoved.map(
        (nodeId) => getNode(nodeId).noteId
      );
      dispatchNotes({
        type: LIST_ACTION_TYPE.DELETE_ITEMS,
        items: [...notesToBeRemoved],
      });
      // Delete Curves
      const curvesToBeRemoved = [
        node.upstreamCurveId,
        ...getDownstreamCurves(nodeId),
      ];
      dispatchCurves({
        type: LIST_ACTION_TYPE.DELETE_ITEMS,
        items: [...curvesToBeRemoved],
      });
      // Reset selectedItem
      setSelectedItem(null);
    }
  };
  useEffect(() => {
    if (nodeToBeDeleted) {
      deleteNode(nodeToBeDeleted);
      setNodeToBeDeleted(null);
    }
  }, [nodeToBeDeleted]);

  // Move Node (and its related Nodes/Curves)
  const [isMovingNode, setIsMovingNode] = useState(false);
  const setMovedNode = (nodeToBeMoved, newCenter) => {
    const newCoord = calcNodeCoord(
      newCenter,
      nodeToBeMoved.width,
      nodeToBeMoved.height
    );
    return { ...nodeToBeMoved, center: newCenter, ...newCoord };
  };
  // Move Curve due to Moved Node
  const setMovedCurve = (moveType, curveToBeMoved, movement) => {
    return {
      ...curveToBeMoved,
      start:
        moveType !== CURVE_MOVE_TYPE.MOVE_END
          ? calcMovingPoint(curveToBeMoved.start, movement)
          : curveToBeMoved.start,
      end:
        moveType !== CURVE_MOVE_TYPE.MOVE_START
          ? calcMovingPoint(curveToBeMoved.end, movement)
          : curveToBeMoved.end,
      startControl:
        moveType !== CURVE_MOVE_TYPE.MOVE_END
          ? calcMovingPoint(curveToBeMoved.startControl, movement)
          : curveToBeMoved.startControl,
      endControl:
        moveType !== CURVE_MOVE_TYPE.MOVE_START
          ? calcMovingPoint(curveToBeMoved.endControl, movement)
          : curveToBeMoved.endControl,
    };
  };
  // Move one point Curve
  const setOnePointMovedCurves = (originalNode, newNode) => {
    const curvesToBeMoved = [
      EDGE.TOP,
      EDGE.RIGHT,
      EDGE.BOTTOM,
      EDGE.LEFT,
    ].reduce((allCurves, edge) => {
      const edgeCurves = newNode[edge].curvesId.map((curveId) => {
        const curve = getCurve(curveId);
        const newCurve =
          newNode[edge].direction === CURVE_DIRECTION.IN
            ? // Move UpstreamCurve
              setMovedCurve(
                CURVE_MOVE_TYPE.MOVE_END,
                curve,
                calcOffset(
                  originalNode.connections[`${edge}Connection`],
                  newNode.connections[`${edge}Connection`]
                )
              )
            : // Move DownstreamCurves
              setMovedCurve(
                CURVE_MOVE_TYPE.MOVE_START,
                curve,
                calcOffset(
                  originalNode.connections[`${edge}Connection`],
                  newNode.connections[`${edge}Connection`]
                )
              );
        return newCurve;
      });
      return [...allCurves, ...edgeCurves];
    }, []);
    return curvesToBeMoved;
  };
  const moveNode = (nodeId) => {
    const nodeToBeMoved = getNode(nodeId);
    if (nodeToBeMoved.parentNodeId) {
      setDragType(DRAG_TYPE.MOVE_NODE);
      if (
        // This part may be redundant
        selectedItem &&
        selectedItem.type === ITEM_TYPE.NODE &&
        selectedItem.id === nodeId
      ) {
        setVirtualNode(nodeToBeMoved);
      }
    }
  };

  // Resize Node
  const [currentResizedCornerType, setCurrentResizedCornerType] = useState(
    null
  );
  const setResizedNode = (originalNode, newCorner, cornerType) => {
    let movement;
    let newWidth, newHeight;
    switch (cornerType) {
      case NODE_POINT_TYPE.TOP_LEFT:
        movement = calcOffset(originalNode.corners.topLeft, newCorner);
        newWidth = originalNode.width - movement.dx;
        newHeight = originalNode.height - movement.dy;
        break;
      case NODE_POINT_TYPE.TOP_RIGHT:
        movement = calcOffset(originalNode.corners.topRight, newCorner);
        newWidth = originalNode.width + movement.dx;
        newHeight = originalNode.height - movement.dy;
        break;
      case NODE_POINT_TYPE.BOTTOM_RIGHT:
        movement = calcOffset(originalNode.corners.bottomRight, newCorner);
        newWidth = originalNode.width + movement.dx;
        newHeight = originalNode.height + movement.dy;
        break;
      case NODE_POINT_TYPE.BOTTOM_LEFT:
        movement = calcOffset(originalNode.corners.bottomLeft, newCorner);
        newWidth = originalNode.width - movement.dx;
        newHeight = originalNode.height + movement.dy;
        break;
      default:
        break;
    }
    const newCenter = {
      x: originalNode.center.x + 0.5 * movement.dx,
      y: originalNode.center.y + 0.5 * movement.dy,
    };
    if (newWidth >= 0 && newHeight >= 0) {
      const newCoord = calcNodeCoord(newCenter, newWidth, newHeight);
      return {
        ...originalNode,
        center: newCenter,
        height: newHeight,
        width: newWidth,
        ...newCoord,
      };
    } else {
      return null;
    }
  };
  const resizeNode = (nodeId, resizedCornerType) => {
    setDragType(DRAG_TYPE.RESIZE_NODE);
    if (
      selectedItem &&
      selectedItem.type === ITEM_TYPE.NODE &&
      selectedItem.id === nodeId
    ) {
      setCurrentResizedCornerType(resizedCornerType);
      const nodeToBeResized = getNode(nodeId);
      setVirtualNode(nodeToBeResized);
    }
  };

  // Automatically Resize Node
  const autoResizeNode = (nodeId, clientTopLeft, clientBottomRight) => {
    const originalNode = getNode(nodeId);
    const newContentTopLeft = convertToSVGCoord(clientTopLeft);
    const newContentBottomRight = convertToSVGCoord(clientBottomRight);
    const newContentWidth = Math.abs(
      newContentBottomRight.x - newContentTopLeft.x
    );
    const newContentHeight = Math.abs(
      newContentBottomRight.y - newContentTopLeft.y
    );
    if (
      newContentWidth > 0.95 * originalNode.width ||
      newContentWidth < 0.85 * originalNode.width ||
      newContentHeight > 0.85 * originalNode.height ||
      newContentHeight < 0.75 * originalNode.height
    ) {
      let newWidth = 1.1 * newContentWidth;
      let newHeight = 1.25 * newContentHeight;
      newWidth =
        newWidth > defaultNodeStyle.width ? newWidth : defaultNodeStyle.width;
      newHeight =
        newHeight > defaultNodeStyle.height
          ? newHeight
          : defaultNodeStyle.height;
      const newCoord = calcNodeCoord(originalNode.center, newWidth, newHeight);
      const newNode = {
        ...originalNode,
        width: newWidth,
        height: newHeight,
        ...newCoord,
      };
      // Update Node
      dispatchNodes({
        type: LIST_ACTION_TYPE.UPDATE_ITEMS,
        items: [newNode],
      });
      // Move Curve
      const curvesToBeMoved = setOnePointMovedCurves(originalNode, newNode);
      dispatchCurves({
        type: LIST_ACTION_TYPE.UPDATE_ITEMS,
        items: curvesToBeMoved,
      });
    }
  };
  // Drag
  const [dragType, setDragType] = useState(null);
  const drag = (e) => {
    if (dragType) {
      if (dragType === DRAG_TYPE.MOVE_CANVAS) {
        const previousCursorSVGCoord = convertToSVGCoord({
          x: e.clientX,
          y: e.clientY,
        });
        const newCursorSVGCoord = convertToSVGCoord({
          x: e.clientX + e.movementX,
          y: e.clientY + e.movementY,
        });
        const cursorSVGMovement = {
          dx: newCursorSVGCoord.x - previousCursorSVGCoord.x,
          dy: newCursorSVGCoord.y - previousCursorSVGCoord.y,
        };
        setViewBoxOrigin({
          x: viewBoxOrigin.x - cursorSVGMovement.dx,
          y: viewBoxOrigin.y - cursorSVGMovement.dy,
        });
      } else if (dragType === DRAG_TYPE.DRAW_NEW_NODE) {
        // Get Start Node
        const startNode = currentStartNode;
        // Set End Node
        const endCenter = convertToSVGCoord({ x: e.clientX, y: e.clientY });
        const endNode = createNode({
          level: startNode.level + 1, // provide level for getting style
          center: endCenter,
        });
        // Get Curve Connection
        const curveConnection = calcCurveConnections(startNode, endNode);
        // Set Curve
        const virtualCurve = createCurve({
          start: currentStartNode.connections[`${currentStartEdge}Connection`], // curveConnection.start,
          end: curveConnection.end,
        });
        // Set Virtual Node and Virtual Curve
        setVirtualNode(endNode);
        setVirtualCurve(virtualCurve);
      } else if (dragType === DRAG_TYPE.MODIFY_CURVE_CONTROL) {
        const newControlPoint = convertToSVGCoord({
          x: e.clientX,
          y: e.clientY,
        });
        const newVirtualCurve = {
          ...virtualCurve,
          [currentCurveControlType]: newControlPoint,
        };
        setVirtualCurve(newVirtualCurve);
      } else if (dragType === DRAG_TYPE.MOVE_CURVE) {
        const newCurvePoint = convertToSVGCoord({ x: e.clientX, y: e.clientY });
        const curveMovement = calcOffset(
          virtualCurve[currentCurvePointType],
          newCurvePoint
        );
        const newControlPoint = calcMovingPoint(
          virtualCurve[`${currentCurvePointType}Control`],
          curveMovement
        );
        const newVirtualCurve = {
          ...virtualCurve,
          [currentCurvePointType]: newCurvePoint,
          [`${currentCurvePointType}Control`]: newControlPoint,
        };
        setVirtualCurve(newVirtualCurve);
      } else if (dragType === DRAG_TYPE.MOVE_NODE) {
        const newCenter = convertToSVGCoord({ x: e.clientX, y: e.clientY });
        const newVirtualNode = setMovedNode(virtualNode, newCenter);
        setVirtualNode(newVirtualNode);
        setIsMovingNode(true);
      } else if (dragType === DRAG_TYPE.RESIZE_NODE) {
        const newCorner = convertToSVGCoord({ x: e.clientX, y: e.clientY });
        const newVirtualNode = setResizedNode(
          virtualNode,
          newCorner,
          currentResizedCornerType
        );
        if (newVirtualNode) {
          setVirtualNode(newVirtualNode);
        }
      }
    }
  };

  // Drop
  const drop = (e) => {
    if (dragType) {
      if (dragType === DRAG_TYPE.MOVE_CANVAS) {
      } else if (dragType === DRAG_TYPE.DRAW_NEW_NODE) {
        // Get Start Node
        const startNode = currentStartNode;
        const endCenter = convertToSVGCoord({ x: e.clientX, y: e.clientY });
        const endNodeId = uuid();
        // Create End Note
        const newNote = createNote(endNodeId);
        // Create End Node
        const endNode = createNode({
          id: endNodeId,
          noteId: newNote.id,
          level: startNode.level + 1,
          center: endCenter,
        });
        // Get Curve Connection
        const curveConnection = calcCurveConnections(startNode, endNode);
        // Create Curve
        const curve = createCurve({
          id: uuid(),
          level: endNode.level,
          start: currentStartNode.connections[`${currentStartEdge}Connection`], // curveConnection.start,
          end: curveConnection.end,
        });
        // Set Node and Curve Relation
        const {
          parentNodeRelationData,
          childNodeRelationData,
          curveRelationData,
        } = setNodeCurveRelation(
          "ADD",
          startNode,
          endNode,
          curve,
          currentStartEdge, // curveConnection.startEdge,
          curveConnection.endEdge
        );
        const newStartNode = { ...startNode, ...parentNodeRelationData };
        const newEndNode = { ...endNode, ...childNodeRelationData };
        const newCurve = { ...curve, ...curveRelationData };
        // Add (and Update) Nodes and Curves
        dispatchNodes({
          type: LIST_ACTION_TYPE.ADD_ITEMS,
          items: [newEndNode],
        });
        dispatchNodes({
          type: LIST_ACTION_TYPE.UPDATE_ITEMS,
          items: [newStartNode],
        });
        dispatchCurves({
          type: LIST_ACTION_TYPE.ADD_ITEMS,
          items: [newCurve],
        });
        dispatchNotes({ type: LIST_ACTION_TYPE.ADD_ITEMS, items: [newNote] });
        // Set Virtual Node and Virtual Curve
        setVirtualNode(null);
        setVirtualCurve(null);
      } else if (dragType === DRAG_TYPE.MODIFY_CURVE_CONTROL) {
        const newControlPoint = convertToSVGCoord({
          x: e.clientX,
          y: e.clientY,
        });
        const originalCurve = getCurve(selectedItem.id);
        const updatedCurve = {
          ...originalCurve,
          [currentCurveControlType]: newControlPoint,
        };
        dispatchCurves({
          type: LIST_ACTION_TYPE.UPDATE_ITEMS,
          items: [updatedCurve],
        });
        setCurrentCurveControlType(null);
        setVirtualCurve(null);
      } else if (dragType === DRAG_TYPE.MOVE_CURVE) {
        const newConnectionNode = hoveredNode;
        const movingCurve = getCurve(selectedItem.id);
        if (newConnectionNode) {
          const isMovingCurveEndToTheSameEndNode =
            currentCurvePointType === CURVE_POINT_TYPE.END &&
            newConnectionNode.id === movingCurve.endNodeId;
          const isMovingCurveStartToNonEndNodeDirection =
            currentCurvePointType === CURVE_POINT_TYPE.START &&
            newConnectionNode.id !== movingCurve.endNodeId &&
            !getNode(movingCurve.endNodeId).childNodesId.some(
              (childId) => childId === newConnectionNode.id
            );
          if (
            isMovingCurveEndToTheSameEndNode ||
            isMovingCurveStartToNonEndNodeDirection
          ) {
            const newCurvePoint = convertToSVGCoord({
              x: e.clientX,
              y: e.clientY,
            });
            const newConnectionEdge = clacMinDistanceEdge(
              newCurvePoint,
              newConnectionNode
            );
            const isMovingCurveEndToNonOutDirection =
              currentCurvePointType === CURVE_POINT_TYPE.END &&
              newConnectionNode[newConnectionEdge].direction !==
                CURVE_DIRECTION.OUT;
            const isMovingCurveStartToNonInDirection =
              currentCurvePointType === CURVE_POINT_TYPE.START &&
              newConnectionNode[newConnectionEdge].direction !==
                CURVE_DIRECTION.IN;
            if (
              isMovingCurveEndToNonOutDirection ||
              isMovingCurveStartToNonInDirection
            ) {
              const newConnectionPoint =
                newConnectionNode.connections[`${newConnectionEdge}Connection`];
              const curveMovement = calcOffset(
                movingCurve[currentCurvePointType],
                newConnectionPoint
              );
              const newControlPoint = calcMovingPoint(
                movingCurve[`${currentCurvePointType}Control`],
                curveMovement
              );

              const originalEndNode = getNode(movingCurve.endNodeId);
              const originalStartNode = getNode(movingCurve.startNodeId);

              let newStartNode, updatedOriginalStartNode, newEndNode, newCurve;
              let removeRelation, addRelation;
              switch (currentCurvePointType) {
                case CURVE_POINT_TYPE.END:
                  removeRelation = setNodeCurveRelation(
                    "REMOVE",
                    originalStartNode,
                    originalEndNode,
                    movingCurve,
                    movingCurve.startEdge,
                    movingCurve.endEdge
                  );
                  newStartNode = {
                    ...originalStartNode,
                    ...removeRelation.parentNodeRelationData,
                  };
                  newCurve = {
                    ...movingCurve,
                    ...removeRelation.curveRelationData,
                  };
                  newEndNode = {
                    ...originalEndNode,
                    ...removeRelation.childNodeRelationData,
                  };
                  addRelation = setNodeCurveRelation(
                    "ADD",
                    originalStartNode,
                    newConnectionNode,
                    movingCurve,
                    movingCurve.startEdge,
                    newConnectionEdge
                  );
                  newStartNode = {
                    ...newStartNode,
                    ...addRelation.parentNodeRelationData,
                  };
                  newCurve = { ...newCurve, ...addRelation.curveRelationData };
                  newEndNode = {
                    ...newEndNode,
                    ...addRelation.childNodeRelationData,
                  };
                  dispatchNodes({
                    type: LIST_ACTION_TYPE.UPDATE_ITEMS,
                    items: [newStartNode, newEndNode],
                  });
                  newCurve = {
                    ...newCurve,
                    [CURVE_POINT_TYPE.END]: newConnectionPoint,
                    [CURVE_CONTROL_TYPE.END_CONTROL]: newControlPoint,
                  };
                  dispatchCurves({
                    type: LIST_ACTION_TYPE.UPDATE_ITEMS,
                    items: [newCurve],
                  });
                  break;
                case CURVE_POINT_TYPE.START:
                  removeRelation = setNodeCurveRelation(
                    "REMOVE",
                    originalStartNode,
                    originalEndNode,
                    movingCurve,
                    movingCurve.startEdge,
                    movingCurve.endEdge
                  );
                  updatedOriginalStartNode = {
                    ...originalStartNode,
                    ...removeRelation.parentNodeRelationData,
                  };
                  newCurve = {
                    ...movingCurve,
                    ...removeRelation.curveRelationData,
                  };
                  newEndNode = {
                    ...originalEndNode,
                    ...removeRelation.childNodeRelationData,
                  };
                  addRelation = setNodeCurveRelation(
                    "ADD",
                    newConnectionNode,
                    originalEndNode,
                    movingCurve,
                    newConnectionEdge,
                    movingCurve.endEdge
                  );
                  newCurve = { ...newCurve, ...addRelation.curveRelationData };
                  newEndNode = {
                    ...newEndNode,
                    ...addRelation.childNodeRelationData,
                  };
                  const isTheSameStartNode =
                    originalStartNode.id === newConnectionNode.id;
                  if (isTheSameStartNode) {
                    newStartNode = {
                      ...updatedOriginalStartNode,
                      ...addRelation.parentNodeRelationData,
                    };
                    // Update Nodes
                    dispatchNodes({
                      type: LIST_ACTION_TYPE.UPDATE_ITEMS,
                      items: [newStartNode, newEndNode],
                    });
                  } else {
                    newStartNode = {
                      ...newConnectionNode,
                      ...addRelation.parentNodeRelationData,
                    };
                    // Reset Node Level
                    const levelDiff =
                      newStartNode.level - originalStartNode.level;
                    newEndNode = {
                      ...newEndNode,
                      level: newEndNode.level + levelDiff,
                    };
                    // Add leve difference to all decendent Nodes of the new End Node
                    const newDecendentNodes = getDecendents(newEndNode.id).map(
                      (decendentNodeId) => {
                        const decendentNode = getNode(decendentNodeId);
                        const newLevel = decendentNode.level + levelDiff;
                        const newDecendentNode = {
                          ...decendentNode,
                          level: newLevel,
                        };
                        return newDecendentNode;
                      }
                    );
                    // Add leve difference to all downstream Curves of the new End Node
                    const newDownStreamCurves = getDownstreamCurves(
                      newEndNode.id
                    ).map((downstreamCurveId) => {
                      const downstreamCurve = getCurve(downstreamCurveId);
                      const newLevel = downstreamCurve.level + levelDiff;
                      const newDownstreamCurve = {
                        ...downstreamCurve,
                        level: newLevel,
                      };
                      return newDownstreamCurve;
                    });
                    // Update Nodes
                    dispatchNodes({
                      type: LIST_ACTION_TYPE.UPDATE_ITEMS,
                      items: [
                        updatedOriginalStartNode,
                        newStartNode,
                        newEndNode,
                        ...newDecendentNodes,
                      ],
                    });
                    // Update Curves
                    dispatchCurves({
                      type: LIST_ACTION_TYPE.UPDATE_ITEMS,
                      items: newDownStreamCurves,
                    });
                  }
                  newCurve = {
                    ...newCurve,
                    level: newEndNode.level,
                    [CURVE_POINT_TYPE.START]: newConnectionPoint,
                    [CURVE_CONTROL_TYPE.START_CONTROL]: newControlPoint,
                  };
                  dispatchCurves({
                    type: LIST_ACTION_TYPE.UPDATE_ITEMS,
                    items: [newCurve],
                  });
                  break;
                default:
                  break;
              }
            }
          }
        }
        setCurrentCurvePointType(null);
        setVirtualCurve(null);
        setHoveredNode(null);
      } else if (dragType === DRAG_TYPE.MOVE_NODE) {
        if (isMovingNode) {
          // set Node moving
          const originalNode = getNode(virtualNode.id);
          const newCenter = convertToSVGCoord({ x: e.clientX, y: e.clientY });
          const newNode = setMovedNode(originalNode, newCenter);
          const nodeMovement = calcOffset(originalNode.center, newNode.center);
          // Set decendents moving
          const decendents = getDecendents(originalNode.id);
          const newDecendents = decendents.map((decendentId) => {
            const decendent = getNode(decendentId);
            const newDecendentCenter = calcMovingPoint(
              decendent.center,
              nodeMovement
            );
            const newDecendent = setMovedNode(decendent, newDecendentCenter);
            return newDecendent;
          });
          // Update Node List
          dispatchNodes({
            type: LIST_ACTION_TYPE.UPDATE_ITEMS,
            items: [newNode, ...newDecendents],
          });
          // set downstreamCurve moving
          const downstreamCurves = getDownstreamCurves(originalNode.id);
          const newDownstreamCurves = downstreamCurves.map(
            (downstreamCurveId) => {
              const downstreamCurve = getCurve(downstreamCurveId);
              const newDownstreamCurve = setMovedCurve(
                CURVE_MOVE_TYPE.MOVE_BOTH,
                downstreamCurve,
                nodeMovement
              );
              return newDownstreamCurve;
            }
          );
          // set UpstreamCurve moving
          const upstreamCurve = getCurve(originalNode.upstreamCurveId);
          const newUpstreamCurve = upstreamCurve
            ? setMovedCurve(
                CURVE_MOVE_TYPE.MOVE_END,
                upstreamCurve,
                nodeMovement
              )
            : null;
          // Update Curves
          const curvesToBeUpdated = upstreamCurve
            ? [newUpstreamCurve, ...newDownstreamCurves]
            : [...newDownstreamCurves];
          dispatchCurves({
            type: LIST_ACTION_TYPE.UPDATE_ITEMS,
            items: curvesToBeUpdated,
          });
        }
        // Reset VirtualNode
        setVirtualNode(null);
        // Cancel Moving Node
        setIsMovingNode(false);
      } else if (dragType === DRAG_TYPE.RESIZE_NODE) {
        const newCorner = convertToSVGCoord({ x: e.clientX, y: e.clientY });
        const originalNode = getNode(virtualNode.id);
        // Resize Node
        const newNode = setResizedNode(
          originalNode,
          newCorner,
          currentResizedCornerType
        );
        if (newNode) {
          // Update Node
          dispatchNodes({
            type: LIST_ACTION_TYPE.UPDATE_ITEMS,
            items: [newNode],
          });
          // Move Curve
          const curvesToBeMoved = setOnePointMovedCurves(originalNode, newNode);
          dispatchCurves({
            type: LIST_ACTION_TYPE.UPDATE_ITEMS,
            items: curvesToBeMoved,
          });
        }
        setVirtualNode(null);
      }
      setDragType(null);
    }
  };

  return (
    <svg
      tabIndex={-1}
      id="svg"
      className="svg"
      xmlns="http://www.w3.org/2000/svg"
      ref={SVGRef}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`${viewBoxOrigin.x} ${viewBoxOrigin.y} ${
        (1 / SVGSizeRatio) * SVGSize.width
      } ${(1 / SVGSizeRatio) * SVGSize.height}`}
      onWheel={(e) => {
        if (e.ctrlKey) {
          if (e.deltaY > 0) {
            resizeCanvas(0.1);
          } else {
            resizeCanvas(-0.1);
          }
        }
      }}
      onFocus={() => {
        if (dragType === null || dragType === DRAG_TYPE.MOVE_CANVAS) {
          setSelectedItem({ tyep: ITEM_TYPE.SVG });
        }
      }}
      onPointerDown={(e) => {
        if (e.target === SVGRef.current) {
          moveCanvas();
        }
      }}
      onPointerMove={(e) => {
        drag(e);
      }}
      onPointerUp={(e) => {
        drop(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Delete" || (e.metaKey && e.key === "Backspace")) {
          if (selectedNode) deleteNode(selectedNode.id);
        }
      }}
    >
      {curveList.map((curve) => (
        <Curve key={curve.id} curveData={curve} />
      ))}
      {nodeList.map((node) => (
        <Node
          key={node.id}
          nodeData={node}
          hoverNode={hoverNode}
          unHoverNode={unHoverNode}
        />
      ))}
      {viewNode && <ViewNode nodeData={viewNode} />}
      {viewCurve && <ViewCurve curveData={viewCurve} />}
      {selectedNode && (
        <SelectedNode
          nodeData={selectedNode}
          moveNode={moveNode}
          drawNewNode={drawNewNode}
          resizeNode={resizeNode}
          autoResizeNode={autoResizeNode}
        />
      )}
      {selectedCurve && (
        <SelectedCurve
          curveData={selectedCurve}
          modifyCurveControl={modifyCurveControl}
          moveCurve={moveCurve}
        />
      )}
      {virtualNode && <VirtualNode nodeData={virtualNode} />}
      {virtualCurve && <VirtualCurve curveData={virtualCurve} />}
    </svg>
  );
};

export default SVG;
