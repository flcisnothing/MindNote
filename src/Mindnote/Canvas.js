import React, { useState, useEffect, useContext, useRef } from "react";
import { v4 as uuid } from "uuid";
import StyleContext from "./StyleContext";
import ItemContext from "./ItemContext";
import Node from "./Node";
import Curve from "./Curve";
import { LIST_ACTION_TYPE } from "./enums";
import {
  calcIntersectionPoint,
  calcCenterPoint,
  calcPointsDistance,
  calcOffset,
} from "./math";

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

const Canvas = (props) => {
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
    width: 1920,
    height: 1080,
  });
  const [SVGSizeRatio, setSVGSizeRatio] = useState(1);
  const [viewBoxOrigin, setViewBoxOrigin] = useState({ x: 0, y: 0 });

  // Style
  const { SVGStyle, nodeStyle, curveStyle } = useContext(StyleContext);
  // Item: NodeList, CurveList
  const { nodeList, dispatchNodes, curveList, dispatchCurves } = useContext(
    ItemContext
  );

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
    const offset = 0.5 * nodeStyle.style.strokeWidth;
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
  const createNode = ({
    center,
    width = nodeStyle.width,
    height = nodeStyle.height,
    style = nodeStyle.style,
    parentId = null,
    upstreamCurveId = null,
    childrenId = [],
    downstreamCurvesId = [],
    top = {
      curveInOut: null,
      childrenId: [],
      curvesId: [],
    },
    right = {
      curveInOut: null,
      childrenId: [],
      curvesId: [],
    },
    bottom = {
      curveInOut: null,
      childrenId: [],
      curvesId: [],
    },
    left = {
      curveInOut: null,
      childrenId: [],
      curvesId: [],
    },
  } = {}) => {
    const id = uuid();
    const { corners, edgeCenters, connections } = calcNodeCoord(
      center,
      width,
      height
    );
    return {
      id,
      center,
      width,
      height,
      corners,
      edgeCenters,
      connections,
      style,
      parentId,
      upstreamCurveId,
      childrenId,
      downstreamCurvesId,
      top,
      right,
      bottom,
      left,
    };
  };

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
    start,
    end,
    startNode = null,
    endNode = null,
    startEdge = null,
    endEdge = null,
    style = curveStyle.style,
  } = {}) => {
    const id = uuid();
    const { startControl, endControl } = calcCurveControl(start, end);
    return {
      id,
      start,
      end,
      startControl,
      endControl,
      startNode,
      endNode,
      startEdge,
      endEdge,
      style,
    };
  };

  // Initialize Canvas
  useEffect(() => {
    // Todo: get Node List from database asynchronously
    // Create Center Node
    if (SVGSize.height !== 0 && SVGSize.width !== 0 && nodeList.length === 0) {
      const center = {
        x: 0.5 * SVGSize.width,
        y: 0.5 * SVGSize.height,
      };
      const centerNode = createNode({ center });
      dispatchNodes({ type: LIST_ACTION_TYPE.ADD_ITEMS, items: [centerNode] });
    }
  }, [SVGSize, nodeList]);

  return (
    <svg
      id="svg"
      className="svg"
      xmlns="http://www.w3.org/2000/svg"
      ref={SVGRef}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`${viewBoxOrigin.x} ${viewBoxOrigin.y} ${
        SVGSizeRatio * SVGSize.width
      } ${SVGSizeRatio * SVGSize.height}`}
      style={SVGStyle.style}
    >
      {nodeList.map((node) => (
        <Node key={node.id} nodeData={node} />
      ))}
      <Curve
        curveData={createCurve({
          start: { x: 10, y: 10 },
          end: { x: 100, y: 100 },
        })}
      />
    </svg>
  );
};

export default Canvas;
