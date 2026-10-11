import type { Artwork } from "@/lib/types";

type Ordered = Pick<Artwork, "sortOrder" | "createdAt">;

/** Originals order: sortOrder ascending, then newest first. */
export function compareArtworks(a: Ordered, b: Ordered): number {
  return (
    a.sortOrder - b.sortOrder ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}
