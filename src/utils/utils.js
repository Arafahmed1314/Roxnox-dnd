export function handleDragEnd(event, ctx) {
    const { active, over } = event;
    if (!over) return;

    const { layout, setLayout, getNextRowId, getNextColumnId, getNextComponentId } = ctx;

    // if dragging an existing component (id like 'a','b') and dropped on trash -> delete
    if (over.id === "trash") {
        // detect if active corresponds to a row or column
        let srcRowEarly = null;
        let srcColEarly = null;
        layout.forEach((row, rIdx) => {
            if (row.id === active.id) srcRowEarly = { rIdx };
            row.columns.forEach((col, cIdx) => {
                if (col.id === active.id) srcColEarly = { rIdx, cIdx };
            });
        });

        if (srcRowEarly) {
            setLayout((prev) => {
                const next = JSON.parse(JSON.stringify(prev));
                next.splice(srcRowEarly.rIdx, 1);
                return next;
            });
            return;
        }
        if (srcColEarly) {
            setLayout((prev) => {
                const next = JSON.parse(JSON.stringify(prev));
                next[srcColEarly.rIdx].columns.splice(srcColEarly.cIdx, 1);
                return next;
            });
            return;
        }

        setLayout((prev) =>
            prev.map((row) => ({
                ...row,
                columns: row.columns.map((col) => ({
                    ...col,
                    components: col.components.filter((c) => c.id !== active.id),
                })),
            }))
        );
        return;
    }

    const data = active?.data?.current;

    // debug logging to help trace drops (remove or gate this later)
    try {
        console.debug("handleDragEnd", {
            activeId: active?.id,
            activeData: active?.data?.current,
            overId: over?.id,
        });
    } catch (e) {
        // ignore console errors in some environments
    }

    // If active corresponds to an existing column id, prefer moving that column
    let srcColEarly = null;
    layout.forEach((row, rIdx) => {
        row.columns.forEach((col, cIdx) => {
            if (col.id === active.id) srcColEarly = { rIdx, cIdx };
        });
    });
    if (
        srcColEarly &&
        over.id &&
        (over.id.startsWith("col-drop-") || over.id.startsWith("col-insert-"))
    ) {
        const parts = over.id.split("-");
        const toRow = parseInt(parts[2], 10);
        const rawCol = parseInt(parts[3], 10);
        // if dropped on a column (`col-drop`), interpret as "after" that column
        const isDropOnColumn = over.id.startsWith("col-drop-");
        let toCol = isDropOnColumn && Number.isFinite(rawCol) ? rawCol + 1 : rawCol;
        setLayout((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            if (!Number.isFinite(toRow) || toRow < 0 || toRow >= next.length) return prev;
            const moving = next[srcColEarly.rIdx].columns.splice(srcColEarly.cIdx, 1)[0];
            if (srcColEarly.rIdx === toRow && srcColEarly.cIdx < toCol) toCol = Math.max(0, toCol - 1);
            if (!Number.isFinite(toCol)) toCol = next[toRow].columns.length;
            toCol = Math.min(Math.max(0, toCol), next[toRow].columns.length);
            next[toRow].columns.splice(toCol, 0, moving);
            return next;
        });
        return;
    }

    // allow dropping a column onto a row-drop or row-empty zone to move the column into that row (append)
    if (
        srcColEarly &&
        over.id &&
        (over.id.startsWith("row-drop-") || over.id.startsWith("row-empty-") || over.id.startsWith("row-"))
    ) {
        let idx = NaN;
        if (over.id.startsWith("row-drop-")) idx = parseInt(over.id.replace("row-drop-", ""), 10);
        else if (over.id.startsWith("row-empty-")) idx = parseInt(over.id.replace("row-empty-", ""), 10);
        else if (over.id.startsWith("row-")) idx = layout.findIndex((r) => r.id === over.id);
        setLayout((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            if (!Number.isFinite(idx)) return prev;
            const moving = next[srcColEarly.rIdx].columns.splice(srcColEarly.cIdx, 1)[0];
            const targetRow = Math.min(Math.max(0, idx), next.length - 1);
            next[targetRow].columns.push(moving);
            return next;
        });
        return;
    }

    if (data && data.type === "row") {
        if (
            over.id &&
            (over.id.startsWith("row-drop-") || over.id.startsWith("row-") || over.id === "canvas-drop")
        ) {
            let idx = 0;
            if (over.id === "canvas-drop") {
                // if moving an existing row, move to end; if creating from sidebar, append new
                if (layout.find((r) => r.id === active.id)) {
                    const from = layout.findIndex((r) => r.id === active.id);
                    setLayout((prev) => {
                        const next = JSON.parse(JSON.stringify(prev));
                        const moving = next.splice(from, 1)[0];
                        next.push(moving);
                        return next;
                    });
                    return;
                }
                setLayout((prev) => {
                    const next = JSON.parse(JSON.stringify(prev));
                    const newRowId = getNextRowId(next);
                    const newColId = getNextColumnId(next);
                    const newRow = { id: newRowId, columns: [{ id: newColId, components: [] }] };
                    next.push(newRow);
                    return next;
                });
                return;
            }
            if (over.id.startsWith("row-drop-")) idx = parseInt(over.id.replace("row-drop-", ""), 10);
            else if (over.id.startsWith("row-")) {
                // dropping on a row -> treat as inserting AFTER that row (makes move down easier)
                const target = layout.findIndex((r) => r.id === over.id);
                idx = target === -1 ? layout.length : target + 1;
            } else {
                idx = layout.findIndex((r) => r.id === over.id);
                if (idx === -1) idx = layout.length;
            }
            // moving an existing row
            if (layout.find((r) => r.id === active.id)) {
                const from = layout.findIndex((r) => r.id === active.id);
                let to = idx;
                if (from < to) to = Math.max(0, to - 1);
                setLayout((prev) => {
                    const next = JSON.parse(JSON.stringify(prev));
                    const moving = next.splice(from, 1)[0];
                    next.splice(to, 0, moving);
                    return next;
                });
                return;
            }
            // creating a new row from the sidebar
            setLayout((prev) => {
                const next = JSON.parse(JSON.stringify(prev));
                const newRowId = getNextRowId(next);
                const newColId = getNextColumnId(next);
                const newRow = { id: newRowId, columns: [{ id: newColId, components: [] }] };
                next.splice(idx, 0, newRow);
                return next;
            });
            return;
        }
    }

    // inserting new column when dragging sidebar 'column'
    if (data && data.type === "column") {
        if (over.id && (over.id.startsWith("col-insert-") || over.id.startsWith("col-drop-"))) {
            const parts = over.id.split("-");
            const rowIndex = parseInt(parts[2], 10);
            const rawColIndex = parseInt(parts[3], 10);
            const isDropOnColumn = over.id.startsWith("col-drop-");
            // if dropped on a column, insert AFTER it; if insert zone, use given index
            const colIndex = isDropOnColumn && Number.isFinite(rawColIndex) ? rawColIndex + 1 : rawColIndex;
            setLayout((prev) => {
                const next = JSON.parse(JSON.stringify(prev));
                if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex >= next.length) return prev;
                const idxRaw = Number.isFinite(colIndex) ? colIndex : next[rowIndex].columns.length;
                const idx = Math.min(Math.max(0, idxRaw), next[rowIndex].columns.length);
                const newColId = getNextColumnId(next);
                next[rowIndex].columns.splice(idx, 0, { id: newColId, components: [] });
                return next;
            });
            return;
        }
        if (over.id && (over.id.startsWith("row-drop-") || over.id.startsWith("row-") || over.id.startsWith("row-empty-"))) {
            let idx = NaN;
            if (over.id.startsWith("row-drop-")) idx = parseInt(over.id.replace("row-drop-", ""), 10);
            else if (over.id.startsWith("row-empty-")) idx = parseInt(over.id.replace("row-empty-", ""), 10);
            else {
                idx = layout.findIndex((r) => r.id === over.id);
                if (idx === -1) idx = layout.length;
            }
            setLayout((prev) => {
                const next = JSON.parse(JSON.stringify(prev));
                if (!Number.isFinite(idx)) return prev;
                const targetRow = Math.min(Math.max(0, idx), next.length - 1);
                const newColId = getNextColumnId(next);
                next[targetRow].columns.push({ id: newColId, components: [] });
                return next;
            });
            return;
        }
    }

    // detect existing component source (we should move existing components rather than create duplicates)
    let srcComp = null;
    layout.forEach((row, rIdx) => {
        row.columns.forEach((col, cIdx) => {
            col.components.forEach((comp, iIdx) => {
                if (comp.id === active.id) srcComp = { rIdx, cIdx, iIdx };
            });
        });
    });

    // inserting new component when dragging a sidebar component into a column dropzone
    // Only create when the active item is NOT an existing component (i.e., source is the sidebar)
    if (data && data.type === "component" && !srcComp) {
        if (over.id && (over.id.startsWith("col-drop-") || over.id.startsWith("col-insert-"))) {
            const parts = over.id.split("-");
            const rowIndex = parseInt(parts[2], 10);
            const colIndexRaw = parseInt(parts[3], 10);
            const colIndex = Number.isFinite(colIndexRaw) ? colIndexRaw : NaN;
            setLayout((prev) => {
                const next = JSON.parse(JSON.stringify(prev));
                const cols = next[rowIndex].columns;
                const newCompId = getNextComponentId(next);
                const newComp = { id: newCompId, label: active.id, componentType: active.id };
                if (cols.length === 0) {
                    const ncId = getNextColumnId(next);
                    const nc = { id: ncId, components: [newComp] };
                    next[rowIndex].columns.push(nc);
                } else {
                    const idx = Number.isFinite(colIndex)
                        ? Math.min(Math.max(0, colIndex), cols.length - 1)
                        : cols.length - 1;
                    next[rowIndex].columns[idx].components.push(newComp);
                }
                return next;
            });
            return;
        }
    }

    // Moving an existing component into a column (including empty columns)
    if (srcComp && over.id && (over.id.startsWith("col-drop-") || over.id.startsWith("col-insert-"))) {
        const parts = over.id.split("-");
        const toRow = parseInt(parts[2], 10);
        const toColRaw = parseInt(parts[3], 10);
        const toCol = Number.isFinite(toColRaw) ? toColRaw : NaN;
        setLayout((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const item = next[srcComp.rIdx].columns[srcComp.cIdx].components.splice(srcComp.iIdx, 1)[0];
            const cols = next[toRow].columns;
            if (cols.length === 0) {
                const ncId = getNextColumnId(next);
                const nc = { id: ncId, components: [item] };
                next[toRow].columns.push(nc);
            } else {
                const targetIdx = Number.isFinite(toCol)
                    ? Math.min(Math.max(0, toCol), cols.length - 1)
                    : cols.length - 1;
                cols[targetIdx].components.push(item);
            }
            return next;
        });
        return;
    }

    // Reordering/moving existing components within layout
    let src = null;
    let dst = null;
    layout.forEach((row, rIdx) => {
        row.columns.forEach((col, cIdx) => {
            col.components.forEach((comp, iIdx) => {
                if (comp.id === active.id) src = { rIdx, cIdx, iIdx };
                if (comp.id === over.id) dst = { rIdx, cIdx, iIdx };
            });
        });
    });

    if (src && dst) {
        setLayout((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const item = next[src.rIdx].columns[src.cIdx].components.splice(src.iIdx, 1)[0];
            next[dst.rIdx].columns[dst.cIdx].components.splice(dst.iIdx, 0, item);
            return next;
        });
        return;
    }
}

export const initialLayout = [
    {
        id: "row0",
        columns: [
            {
                id: "column0",
                components: [
                    { id: "component0", label: "component0", componentType: "COMPONENT" },
                    { id: "component1", label: "component1", componentType: "COMPONENT" },
                ],
            },
        ],
    },
    {
        id: "row1",
        columns: [
            {
                id: "column1",
                components: [{ id: "component2", label: "rWGS0vIT1", componentType: "COMPONENT" }],
            },
            { id: "column2", components: [] },
        ],
    },
];

export function onMouseMove(e, ctx) {
    const { resizing, setLayout } = ctx;
    if (!resizing.current) return;
    if (resizing.current.type === "horizontal") {
        const { rowIndex, leftIndex, lastX } = resizing.current;
        const delta = e.clientX - lastX;
        resizing.current.lastX = e.clientX;
        setLayout((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const cols = next[rowIndex].columns;
            const left = cols[leftIndex];
            const right = cols[leftIndex + 1];
            if (!right) return next;
            const newLeft = Math.max(80, (left.width || 240) + delta);
            const newRight = Math.max(80, (right.width || 240) - delta);
            left.width = newLeft;
            right.width = newRight;
            return next;
        });
    }
}

export default { handleDragEnd, onMouseMove, initialLayout };
