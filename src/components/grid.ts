// The Originals grid layout, shared by the storefront and the admin collection
// editor so both show the pieces in the same places.

/** 1 column on phones, 2 from tablet (768 px), 3 from 1280 px. */
export const GRID_CLASS = "grid gap-4 md:grid-cols-2 md:gap-5 lg:gap-7 xl:grid-cols-3 xl:gap-6";

/** Where a piece sits in the grid, for the admin's "Row 2, left" label. */
export function gridPosition(index: number, columns: 2 | 3) {
  const column = index % columns;
  return {
    row: Math.floor(index / columns) + 1,
    side: column === 0 ? "left" : column === columns - 1 ? "right" : "middle",
  };
}
