import React, { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function GridItem({ id, label, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: "component" } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };

  const clickPossible = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const threshold = 6; // pixels
  const pointerDown = (e) => {
    // only primary button
    if (e && typeof e.button !== "undefined" && e.button !== 0) return;
    clickPossible.current = true;
    startPos.current = { x: e.clientX || 0, y: e.clientY || 0 };
  };
  const pointerMove = (e) => {
    if (!clickPossible.current) return;
    const dx = Math.abs((e.clientX || 0) - startPos.current.x);
    const dy = Math.abs((e.clientY || 0) - startPos.current.y);
    if (dx > threshold || dy > threshold) clickPossible.current = false;
  };
  const pointerUp = (e) => {
    if (e && typeof e.button !== "undefined" && e.button !== 0) {
      clickPossible.current = false;
      return;
    }
    if (clickPossible.current && !isDragging) {
      onClick && onClick(id);
    }
    clickPossible.current = false;
  };

  // merge listeners so we don't clobber dnd-kit handlers
  const composedListeners = {
    ...listeners,
    onPointerDown: (e) => {
      if (e && e.button === 0) pointerDown(e);
      listeners.onPointerDown && listeners.onPointerDown(e);
    },
    onPointerMove: (e) => {
      pointerMove(e);
      listeners.onPointerMove && listeners.onPointerMove(e);
    },
    onPointerUp: (e) => {
      pointerUp(e);
      listeners.onPointerUp && listeners.onPointerUp(e);
    },
    onContextMenu: (e) => {
      /* prevent right-click causing unintended behavior inside draggable items */
    },
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...composedListeners}
      className={`relative bg-white border border-gray-300 rounded p-3 shadow-sm ${
        isDragging ? "scale-105 shadow-lg" : ""
      } cursor-grab`}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClick(id);
        }}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center pointer-events-auto"
      >
        i
      </button>

      <div className="font-semibold text-sm">{label}</div>
    </div>
  );
}
