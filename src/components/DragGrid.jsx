import React from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import GridItem from "./GridItem";

// DragGrid: renders a vertical list of sortable items inside a column.
// State and DndContext are expected to be managed by the parent.
export default function DragGrid({ items, onItemClick }) {
  return (
    <SortableContext
      items={items.map((i) => i.id)}
      strategy={rectSortingStrategy}
    >
      <div className="flex flex-col gap-3">
        {items.map((it) => (
          <GridItem
            key={it.id}
            id={it.id}
            label={it.label}
            onClick={onItemClick}
          />
        ))}
      </div>
    </SortableContext>
  );
}
