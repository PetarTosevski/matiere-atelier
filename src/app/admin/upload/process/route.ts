import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { ImageError, MAX_UPLOAD_BYTES, processImage } from "@/lib/images";
import { discardFiles, fileSize, fileUrl, readFile, storeFile } from "@/lib/storage";

// Second step of an upload (see ../route.ts): the original is already in
// Convex storage. Process it with sharp, store the WebP, delete the original.

const bodySchema = z.object({ storageId: z.string().min(1).max(100).regex(/^[a-z0-9]+$/) });

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
  const original = parsed.data.storageId;

  try {
    const size = await fileSize(original);
    if (size === null) return NextResponse.json({ error: "failed" }, { status: 404 });
    if (size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });

    const bytes = await readFile(original);
    if (!bytes) return NextResponse.json({ error: "failed" }, { status: 404 });
    const processed = await processImage(bytes);
    const storageId = await storeFile(processed.data, "image/webp");
    return NextResponse.json({
      storageId,
      width: processed.width,
      height: processed.height,
      src: await fileUrl(storageId),
    });
  } catch (error) {
    if (error instanceof ImageError) {
      return NextResponse.json({ error: error.problem }, { status: 422 });
    }
    console.error("[admin] upload failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  } finally {
    // The original is never kept: it may carry GPS location. discardFiles
    // refuses files an artwork or the About page uses, so a stored image's
    // ID sent here by mistake is left alone.
    await discardFiles([original]).catch((error) =>
      console.error("[admin] could not delete an upload original", error),
    );
  }
}
