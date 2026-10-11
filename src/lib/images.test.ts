import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageError, processImage, sniffImageType } from "@/lib/images";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])),
  );

describe("sniffImageType", () => {
  it("recognizes formats by their first bytes", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffImageType(bytes(0x89, "PNG\r\n\x1a\n"))).toBe("png");
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("webp");
    expect(sniffImageType(bytes(0, 0, 0, 0x18, "ftypheic"))).toBe("heic");
    expect(sniffImageType(bytes("GIF89a"))).toBeNull();
  });
});

describe("processImage", () => {
  it("rejects HEIC with a specific error", async () => {
    await expect(processImage(bytes(0, 0, 0, 0x18, "ftypheic", 0, 0, 0, 0))).rejects.toEqual(
      new ImageError("heic"),
    );
  });

  it("rejects files that aren't JPEG, PNG or WebP", async () => {
    await expect(processImage(bytes("GIF89a", 0, 0, 0))).rejects.toEqual(new ImageError("unsupported"));
  });

  it("resizes to a 2560 px long edge, outputs WebP and strips metadata", async () => {
    const input = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: "#808080" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret-location-marker" } })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const output = await processImage(new Uint8Array(input));
    const meta = await sharp(output.data).metadata();
    expect(meta.format).toBe("webp");
    expect([output.width, output.height]).toEqual([2560, 1280]);
    expect(meta.exif).toBeUndefined();
    expect(output.data.includes(Buffer.from("secret-location-marker"))).toBe(false);
  });

  it("never enlarges small images", async () => {
    const input = await sharp({
      create: { width: 400, height: 300, channels: 3, background: "#808080" },
    })
      .png()
      .toBuffer();
    const output = await processImage(new Uint8Array(input));
    expect([output.width, output.height]).toEqual([400, 300]);
  });
});
