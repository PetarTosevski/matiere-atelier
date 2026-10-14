import { unsubscribe } from "@/lib/newsletter";

// One-click unsubscribe (RFC 8058): mail apps such as Gmail POST here when the
// reader presses their own Unsubscribe button. The address is in each
// newsletter's List-Unsubscribe header (lib/newsletter.ts).

export async function POST(request: Request) {
  const url = new URL(request.url);
  const done = await unsubscribe(
    (url.searchParams.get("c") ?? "").slice(0, 64),
    (url.searchParams.get("t") ?? "").slice(0, 128),
  );
  return new Response(null, { status: done ? 200 : 400 });
}
