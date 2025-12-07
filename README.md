# RoxNor Grid Editor

A small grid editor with drag & drop using `dnd-kit`

## Quick overview

- Drag items from the left sidebar to build layout:
  - `row` → creates a horizontal row (container for columns)
  - `column` → creates a column inside a row
  - `component` (demo/image/input) → UI elements dropped into columns
- Click any component (small dot/its element) to open a modal — the modal shows that item's `id`.
- Use the vertical divider between columns to resize horizontally (resizing disables dragging while active).
- Drop items on the `TRASH` area to delete rows, columns, or components.
- Live JSON export is shown at the bottom — nested shape: rows → columns → components.

## Run locally

1. Install dependencies

```bash
npm install
```

2. Start dev server

```bash
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Developer notes

- Main files:
  - `src/App.jsx` — app shell, DnD context, DropZones, JSON export, modal.
  - `src/utils/utils.js` — `handleDragEnd`, `onMouseMove`, and `initialLayout`.
  - `src/components/*` — `LeftSidebar`, `RightSidebar`, `Column`, `GridItem`, `DragGrid`, etc.
