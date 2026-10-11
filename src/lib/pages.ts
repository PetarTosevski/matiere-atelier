import "server-only";
import { cache } from "react";
import { api, convexMutation, convexQuery, shouldUseStaticData } from "@/lib/convex";
import type { ArtworkImage } from "@/lib/types";

// Content of pages the artist edits in the admin. Today: the About page.

export type AboutPage = {
  /** Markdown. */
  bio: string;
  portrait: ArtworkImage | null;
};

export type AboutPageForAdmin = {
  bio: string;
  portrait: (ArtworkImage & { storageId: string }) | null;
};

export type AboutInput = {
  bio: string;
  portrait: { storageId: string; width: number; height: number; alt: string } | null;
};

/** Null until the artist saves the page; it then replaces the placeholders. */
export const getAboutPage = cache(async (): Promise<AboutPage | null> => {
  if (shouldUseStaticData()) return null;
  const about = await convexQuery(api.pages.getAbout, {});
  if (!about) return null;
  const portrait = about.portrait
    ? { src: about.portrait.src, width: about.portrait.width, height: about.portrait.height, alt: about.portrait.alt }
    : null;
  return { bio: about.bio, portrait };
});

export async function getAboutPageForAdmin(): Promise<AboutPageForAdmin | null> {
  if (shouldUseStaticData()) throw new Error("Editing pages needs Convex");
  return convexQuery(api.pages.getAbout, {});
}

export async function saveAboutPage(input: AboutInput): Promise<void> {
  if (shouldUseStaticData()) throw new Error("Editing pages needs Convex");
  await convexMutation(api.pages.setAbout, {
    bio: input.bio,
    portrait: input.portrait ? { ...input.portrait, storageId: input.portrait.storageId as never } : null,
  });
}
