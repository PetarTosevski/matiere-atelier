import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ImageError, MAX_UPLOAD_BYTES, processImage } from "@/lib/images";
import { fileUrl, storeFile } from "@/lib/storage";

// Image uploads go through this route rather than a server action, so the
// 20 MB limit applies here only and not to every public form.

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "unsupported" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  }

  try {
    const processed = await processImage(new Uint8Array(await file.arrayBuffer()));
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
  }
}
