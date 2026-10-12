import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createUploadUrl } from "@/lib/storage";

// Photos are too large to pass through the Next.js server (Vercel refuses
// request bodies over 4.5 MB). So the browser asks here for a one-time Convex
// upload URL, sends the original there, then asks /admin/upload/process to
// turn it into the stored WebP. Only a signed-in admin gets a URL.

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ uploadUrl: await createUploadUrl() });
  } catch (error) {
    console.error("[admin] could not create an upload URL", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
