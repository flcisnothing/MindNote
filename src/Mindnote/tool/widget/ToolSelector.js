import React, { useState, useEffect, useRef } from "react";

const ToolSelector = (props) => {
  const { children } = props;
  const [isToolSelectorDisplayed, setIsToolSelectorDisplayed] = useState(false);
  const openToolSelector = () => setIsToolSelectorDisplayed(true);
  const closeToolSelector = () => setIsToolSelectorDisplayed(false);
  const selectorRef = useRef(null);
  useEffect(() => {
    if (isToolSelectorDisplayed) {
      selectorRef.current.focus();
    }
  }, [isToolSelectorDisplayed]);
  return (
    <div>
      <span className="tool-trigger" onClick={openToolSelector}>
        <i className="fas fa-angle-down"></i>
      </span>
      <div
        tabIndex={-1}
        ref={selectorRef}
        className="tool-selector"
        style={{ display: isToolSelectorDisplayed ? "block" : "none" }}
        onClick={closeToolSelector}
        onBlur={closeToolSelector}
      >
        {children}
      </div>
    </div>
  );
};

export default ToolSelector;
