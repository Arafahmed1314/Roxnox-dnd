import React, { useState, useCallback, useRef } from "react";
import "./index.css";
import {
  DndContext,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import DragGrid from "./components/DragGrid";
import Column from "./components/Column";
import {
  handleDragEnd as utilsHandleDragEnd,
  initialLayout as utilsInitialLayout,
  onMouseMove as utilsOnMouseMove,
} from "./utils/utils";
import LeftSidebar from "./components/LeftSidebar";
import RightSidebar from "./components/RightSidebar";

function Trash() {
  const { isOver, setNodeRef } = useDroppable({ id: "trash" });
  return (
    <div
      ref={setNodeRef}
      className={`border-4 px-6 py-4 w-[110px] text-center font-bold bg-white ${
        isOver ? "border-pink-600 bg-pink-50" : "border-[#b36bb3]"
      }`}
    >
      TRASH
    </div>
  );
}

function DropZone({
  id,
  children,
  draggingType = null,
  fill = false,
  allowedTypes = [],
}) {
  // register droppable so DnDContext recognizes it
  const { isOver, setNodeRef } = useDroppable({ id });
  // determine whether this zone accepts the currently dragged type
  const shouldHighlight =
    isOver &&
    draggingType &&
    Array.isArray(allowedTypes) &&
    allowedTypes.includes(draggingType);

  // derive outline and background colors from allowedTypes
  const { outlineColor = "", bgColor = "" } = (() => {
    if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) return {};
    if (allowedTypes.includes("row"))
      return { outlineColor: "outline-green-400", bgColor: "bg-green-50" };
    if (allowedTypes.includes("column"))
      return { outlineColor: "outline-red-400", bgColor: "bg-red-50" };
    if (allowedTypes.includes("component"))
      return { outlineColor: "outline-blue-300", bgColor: "bg-blue-50" };
    return {};
  })();

  const baseClass = shouldHighlight
    ? `outline-4 outline-dashed ${outlineColor} transition-colors duration-150 ease-in-out ${
        fill ? bgColor : ""
      }`
    : "";

  const wrapperClass = fill ? `absolute inset-0 ${baseClass}` : baseClass;

  return (
    <div ref={setNodeRef} className={wrapperClass}>
      {children}
    </div>
  );
}

function Row({ row, rowIndex, draggingType, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: row.id,
    data: { type: "row" },
  });

  return (
    <div className="mb-6 relative">
      {/* drag handle: only this small control starts row drag */}
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`absolute -top-2 right-2 p-1 rounded ${
          isDragging ? "opacity-70 cursor-grabbing" : "cursor-grab"
        }`}
        title="Drag row"
      >
        ≡
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [layout, setLayout] = useState(utilsInitialLayout);
  const [modalId, setModalId] = useState(null);
  const [draggingType, setDraggingType] = useState(null);

  // helpers to create sequential ids matching the screenshot style
  const getNextRowId = (existing) => {
    const ids = existing.map((r) => r.id);
    let max = -1;
    ids.forEach((id) => {
      const m = id.match(/^row(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `row${max + 1}`;
  };

  const getNextColumnId = (existing) => {
    const cols = [];
    existing.forEach((r) => r.columns.forEach((c) => cols.push(c.id)));
    let max = -1;
    cols.forEach((id) => {
      const m = id.match(/^column(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `column${max + 1}`;
  };

  const getNextComponentId = (existing) => {
    const comps = [];
    existing.forEach((r) =>
      r.columns.forEach((c) => c.components.forEach((p) => comps.push(p.id)))
    );
    let max = -1;
    comps.forEach((id) => {
      const m = id.match(/^component(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `component${max + 1}`;
  };

  const sensors = useSensors(useSensor(PointerSensor));

  // resizing state
  const resizing = useRef(null);

  // wrapper that calls the utils onMouseMove with proper context
  const handleMouseMove = (e) => utilsOnMouseMove(e, { resizing, setLayout });

  const beginResize = (rowIndex, leftIndex, startX) => {
    resizing.current = {
      type: "horizontal",
      rowIndex,
      leftIndex,
      lastX: startX,
    };
    // listen for both pointer and mouse events to ensure we receive the end event
    window.addEventListener("pointermove", handleMouseMove);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("pointerup", endResize);
    window.addEventListener("mouseup", endResize);
  };

  const endResize = () => {
    resizing.current = null;
    window.removeEventListener("pointermove", handleMouseMove);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("pointerup", endResize);
    window.removeEventListener("mouseup", endResize);
  };

  // delegate heavy drag-end logic to utils to keep this file tidy
  const handleDragEnd = (event) => {
    utilsHandleDragEnd(event, {
      layout,
      setLayout,
      getNextRowId,
      getNextColumnId,
      getNextComponentId,
    });
  };

  const handleDragStart = (event) => {
    // if we're in the middle of a resize, don't start a dnd drag
    if (resizing.current) return;
    const type = event.active?.data?.current?.type || null;
    setDraggingType(type);
  };

  const showModal = (id) => setModalId(id);
  const closeModal = () => setModalId(null);

  // transform internal layout to requested export shape
  const transformForExport = (src) => {
    return {
      layout: src.map((row) => ({
        type: "ROW",
        id: row.id,
        children: row.columns.map((col) => ({
          type: "COLUMN",
          id: col.id,
          children: col.components.map((c) => {
            const ct = c.componentType || c.label || null;
            return {
              type: ct ? String(ct).toUpperCase() : "COMPONENT",
              id: c.id,
            };
          }),
        })),
      })),
    };
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={(e) => {
        handleDragEnd(e);
        setDraggingType(null);
      }}
    >
      <div className="flex min-h-screen p-6">
        <LeftSidebar />

        <RightSidebar>
          <div className="w-full max-w-[1000px] bg-white border-4 border-[#2e8b57] min-h-[560px] p-5 relative mx-auto">
            <DropZone
              id={`canvas-drop`}
              draggingType={draggingType}
              fill
              allowedTypes={["row"]}
            >
              {/* full-cover invisible dropzone so users can drop sidebar items anywhere on canvas */}
            </DropZone>
            {layout.map((row, rowIndex) => (
              <Row
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                draggingType={draggingType}
              >
                <div className="relative border-2 border-[#e04b4b] p-4">
                  <div className="absolute -top-3 left-3 bg-white px-2 font-bold text-sm">
                    {row.id}
                  </div>
                  <div className="mt-2 flex gap-6">
                    {row.columns.map((col, colIndex) => (
                      <React.Fragment key={col.id}>
                        <DropZone
                          id={`col-insert-${rowIndex}-${colIndex}`}
                          draggingType={draggingType}
                          allowedTypes={["column", "component"]}
                        />
                        <Column
                          col={col}
                          rowIndex={rowIndex}
                          colIndex={colIndex}
                          draggingType={draggingType}
                          allowedTypes={["component", "column"]}
                        >
                          <div className="font-bold mb-3">{col.id}</div>
                          <div className="space-y-3">
                            <DragGrid
                              items={col.components}
                              onItemClick={showModal}
                            />
                          </div>
                        </Column>

                        {colIndex < row.columns.length - 1 && (
                          <div
                            onPointerDownCapture={(e) => {
                              // capture pointer down to start resize before dnd-kit sensors
                              e.stopPropagation();
                              e.preventDefault();
                              beginResize(rowIndex, colIndex, e.clientX);
                            }}
                            className="w-3 cursor-col-resize flex items-stretch justify-center"
                          >
                            <div className="w-px bg-gray-300 h-full hover:bg-gray-500" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    <DropZone
                      id={`col-insert-${rowIndex}-${row.columns.length}`}
                      draggingType={draggingType}
                      allowedTypes={["column", "component"]}
                    />
                  </div>
                  {/* if a row has no columns, provide a large drop area inside the row so users can drop columns into it */}
                  {row.columns.length === 0 && (
                    <div className="mt-4 relative">
                      <DropZone
                        id={`row-empty-${rowIndex}`}
                        draggingType={draggingType}
                        fill
                        allowedTypes={["column"]}
                      />
                      <div className="text-sm text-gray-500 italic">
                        Drop here to add a column
                      </div>
                    </div>
                  )}
                </div>
                {/* dropzone for inserting a new row before this row */}
                <DropZone
                  id={`row-drop-${rowIndex}`}
                  draggingType={draggingType}
                  allowedTypes={["row"]}
                />
              </Row>
            ))}
            {/* allow inserting at end */}
            <DropZone
              id={`row-drop-${layout.length}`}
              draggingType={draggingType}
              allowedTypes={["row"]}
            />
          </div>

          <div className="flex justify-center mt-6">
            <Trash />
          </div>

          <div className="mt-8">
            <div className="font-bold mb-2">Full Object Data:</div>
            <textarea
              readOnly
              className="w-full h-56 p-3 border-2"
              value={JSON.stringify(transformForExport(layout), null, 2)}
            />
          </div>

          {modalId && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center">
                <div className="text-lg font-semibold mb-3">Item ID</div>
                <div className="mb-6 text-sm text-gray-700">{modalId}</div>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </RightSidebar>
      </div>
    </DndContext>
  );
}
