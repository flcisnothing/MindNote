import React, { useState, useReducer, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import Header from "../Header";
import SVG from "./SVG";
import CommonTool from "./CommonTool";
import NodeTool from "./NodeTool";
import CurveTool from "./CurveTool";
import Note from "./Note";
import StyleContext from "./StyleContext";
import ItemContext from "./ItemContext";
import {
  LIST_ACTION_TYPE,
  SHOW_TOOL_TYPE,
  TOOL_TYPE,
  ITEM_TYPE,
} from "./enums";
import "./Mindnote.css";

const listReducer = (list, action) => {
  switch (action.type) {
    case LIST_ACTION_TYPE.INIT_ITEMS:
      return [...action.items];
    case LIST_ACTION_TYPE.ADD_ITEMS:
      return [...list, ...action.items];
    case LIST_ACTION_TYPE.UPDATE_ITEMS:
      const unChangedItems = list.filter(
        (item) =>
          !action.items.some(
            (itemToBeUpdated) => itemToBeUpdated.id === item.id
          )
      );
      return [...unChangedItems, ...action.items];
    case LIST_ACTION_TYPE.DELETE_ITEMS:
      return list.filter(
        (item) =>
          !action.items.some(
            (itemToBeDeletedId) => itemToBeDeletedId === item.id
          )
      );
    default:
      return list;
  }
};
const showToolReducer = (isShowTool, action) => {
  switch (action.type) {
    case SHOW_TOOL_TYPE.SHOW_NODE_TOOL:
      return { ...isShowTool, showNodeTool: true };
    case SHOW_TOOL_TYPE.SHOW_CURVE_TOOL:
      return { ...isShowTool, showCurveTool: true };
    case SHOW_TOOL_TYPE.SHOW_NOTE:
      return { ...isShowTool, showNote: true };
    case SHOW_TOOL_TYPE.CLOSE_NODE_TOOL:
      return { ...isShowTool, showNodeTool: false };
    case SHOW_TOOL_TYPE.CLOSE_CURVE_TOOL:
      return { ...isShowTool, showCurveTool: false };
    case SHOW_TOOL_TYPE.CLOSE_NOTE:
      return { ...isShowTool, showNote: false };
    case SHOW_TOOL_TYPE.CLOSE_ALL:
      return { showNodeTool: false, showCurveTool: false, showNote: false };
    default:
      return isShowNote;
  }
};

const Mindnote = (props) => {
  // Mindnote Data
  const [nodeList, dispatchNodes] = useReducer(listReducer, []);
  const getNode = (nodeId) => nodeList.find((node) => node.id === nodeId);
  const [curveList, dispatchCurves] = useReducer(listReducer, []);
  const getCurve = (curveId) => curveList.find((curve) => curve.id === curveId);
  const [noteList, dispatchNotes] = useReducer(listReducer, []);
  const getNote = (noteId) => noteList.find((note) => note.id === noteId);
  const [isShowTool, dispatchShowTool] = useReducer(showToolReducer, {
    showNode: false,
    showCurve: false,
    showNote: false,
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  useEffect(() => {
    if (selectedItem && selectedItem.type === ITEM_TYPE.NODE) {
      const node = getNode(selectedItem.id);
      setSelectedNote(node.noteId);
      dispatchShowTool({ type: SHOW_TOOL_TYPE.SHOW_NOTE });
    } else {
      setSelectedNote(null);
      dispatchShowTool({ type: SHOW_TOOL_TYPE.CLOSE_NOTE });
    }
  }, [selectedItem]);
  const ItemContextValue = {
    dispatchNodes,
    getNode,
    dispatchCurves,
    getCurve,
    dispatchNotes,
    getNote,
    setSelectedItem,
  };
  const { docId, mindnoteId } = useParams();
  // Get mindnote data from database
  useEffect(() => {
    if (mindnoteId) {
      const mindnoteRef = db.collection("mindnotes").doc(mindnoteId);
      mindnoteRef
        .get()
        .then((mindnoteDoc) => {
          if (mindnoteDoc.exists) {
            const mindnote = mindnoteDoc.data();
            if (mindnote.nodeList.length !== 0) {
              dispatchNodes({
                type: LIST_ACTION_TYPE.INIT_ITEMS,
                items: mindnote.nodeList,
              });
              dispatchCurves({
                type: LIST_ACTION_TYPE.INIT_ITEMS,
                items: mindnote.curveList,
              });
              dispatchNotes({
                type: LIST_ACTION_TYPE.INIT_ITEMS,
                items: mindnote.noteList,
              });
            }
          } else {
            // mindnoteDoc.data() will be undefined in this case
            console.log("No such mindnote!");
          }
        })
        .catch((error) => {
          console.log("Error getting mindnote:", error);
        });
    }
  }, []);
  // Doc Data
  const [doc, setDoc] = useState(null);
  // Get doc data from database
  useEffect(() => {
    if (docId) {
      const docRef = db.collection("docs").doc(docId);
      docRef
        .get()
        .then((docDoc) => {
          if (docDoc.exists) {
            const doc = docDoc.data();
            setDoc(doc);
          } else {
            // docDoc.data() will be undefined in this case
            console.log("No such doc!");
          }
        })
        .catch((error) => {
          console.log("Error getting doc:", error);
        });
    }
  }, []);
  const modifyDocTitle = (newTitle) => {
    setDoc({ ...doc, title: newTitle });
  };
  const [isSaving, setIsSaving] = useState(false);
  // Save(Update) doc/mindnote data to database
  const saveMindnoteToDB = async (doc, nodeList, curveList, noteList) => {
    setIsSaving(true);
    try {
      const mindnoteRef = db.collection("mindnotes").doc(mindnoteId);
      await mindnoteRef.update({
        nodeList,
        curveList,
        noteList,
      });
      const docRef = db.collection("docs").doc(docId);
      await docRef.set(doc);
      setIsSaving(false);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
    // db.collection("mindnotes")
    //   .doc(mindnoteId)
    //   .update({
    //     nodeList,
    //     curveList,
    //     noteList,
    //   })
    //   .then(() => {
    //     setIsSaving(false);
    //     console.log("Document successfully updated!");
    //   })
    //   .catch((error) => {
    //     // The document probably doesn't exist.
    //     console.error("Error updating document: ", error);
    //   });
  };
  return (
    <div className="mindnote">
      <div className="canvas">
        <ItemContext.Provider value={ItemContextValue}>
          <SVG
            nodeList={nodeList}
            curveList={curveList}
            noteList={noteList}
            selectedItem={selectedItem}
          />
          <CommonTool
            saveMindnoteToDB={() =>
              saveMindnoteToDB(doc, nodeList, curveList, noteList)
            }
            showNodeTool={() =>
              dispatchShowTool({ type: SHOW_TOOL_TYPE.SHOW_NODE_TOOL })
            }
            showCurveTool={() =>
              dispatchShowTool({ type: SHOW_TOOL_TYPE.SHOW_CURVE_TOOL })
            }
            showNote={() =>
              dispatchShowTool({ type: SHOW_TOOL_TYPE.SHOW_NOTE })
            }
            selectedItem={selectedItem}
            docTitle={doc ? doc.title : ""}
            modifyDocTitle={modifyDocTitle}
          />
          <NodeTool
            isShowNodeTool={isShowTool.showNodeTool}
            closeTool={() =>
              dispatchShowTool({ type: SHOW_TOOL_TYPE.CLOSE_NODE_TOOL })
            }
          />
          <CurveTool
            isShowCurveTool={isShowTool.showCurveTool}
            closeTool={() =>
              dispatchShowTool({ type: SHOW_TOOL_TYPE.CLOSE_CURVE_TOOL })
            }
          />
          <Note
            isShowNote={isShowTool.showNote}
            closeTool={() =>
              dispatchShowTool({ type: SHOW_TOOL_TYPE.CLOSE_NOTE })
            }
            selectedItem={selectedItem}
            selectedNote={selectedNote}
          />
        </ItemContext.Provider>
        {isSaving ? <Saving /> : ""}
      </div>
    </div>
  );
};

const Saving = (props) => {
  return (
    <div className="loading">
      <div className="loading-icon">
        <i className="fas fa-spinner"></i>
      </div>
    </div>
  );
};

export default Mindnote;
