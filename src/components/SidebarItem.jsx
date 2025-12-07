import React from "react";
import { useDraggable } from "@dnd-kit/core";

export default function SidebarItem({ id, label, type, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onClick && onClick(id)}
      className={`bg-[#dadada] border border-[#bfbfbf] px-3 py-2 mb-2 rounded text-left cursor-grab ${
        isDragging ? "opacity-70" : ""
      }`}
    >
      {label}
    </div>
  );
}
