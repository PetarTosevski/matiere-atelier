import { notFound } from "next/navigation";

// Sends unknown paths under a locale to [locale]/not-found.tsx, so they get
// the site header and footer.
export default function CatchAllPage() {
  notFound();
}
