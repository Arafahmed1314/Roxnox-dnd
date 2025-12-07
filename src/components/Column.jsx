import React, { useRef, useEffect } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";

export default function Column({
  col,
  rowIndex,
  colIndex,
  children,
  draggingType = null,
  allowedTypes = [],
}) {
  const mainRef = useRef(null);
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: col.id,
    data: { type: "column", rowIndex, colIndex },
  });
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `col-drop-${rowIndex}-${colIndex}`,
  });

  useEffect(() => {
    if (mainRef.current) setDropRef(mainRef.current);
  }, [setDropRef]);

  const shouldHighlight =
    isOver &&
    draggingType &&
    Array.isArray(allowedTypes) &&
    allowedTypes.includes(draggingType);

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

  return (
    <div
      ref={mainRef}
      style={{
        height: "auto",
        width: col.width || undefined,
        overflow: "auto",
      }}
      className={`border-2 border-[#2b6cff] p-4 relative ${
        col.width ? "" : "flex-1"
      } ${
        shouldHighlight
          ? `outline-4 outline-dashed ${outlineColor} transition-colors duration-150 ease-in-out ${bgColor}`
          : ""
      }`}
    >
      {/* Drag handle: attach draggable listeners here so child clicks still work */}
      <div
        ref={setDragRef}
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 cursor-grab p-1 opacity-70 hover:opacity-100"
      >
        ≡
      </div>
      {children}
    </div>
  );
}
