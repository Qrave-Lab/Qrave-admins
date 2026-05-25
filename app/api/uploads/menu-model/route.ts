import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireSessionEmail } from "@/lib/auth/server";

export const runtime = "nodejs";

const MAX_GLB_BYTES = 12 * 1024 * 1024;

function getSafeBaseName(name: string) {
  const clean = path
    .basename(name || "model.glb")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "model.glb";
}

export async function POST(request: Request) {
  const sessionEmail = await requireSessionEmail();
  if (!sessionEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "GLB file is required" }, { status: 400 });
    }

    const name = String(file.name || "").toLowerCase();
    const hasGlbExt = name.endsWith(".glb");
    const hasGlbMime = file.type === "model/gltf-binary" || file.type === "application/octet-stream" || file.type === "";
    if (!hasGlbExt || !hasGlbMime) {
      return NextResponse.json({ error: "Only .glb files are supported" }, { status: 400 });
    }

    if (file.size > MAX_GLB_BYTES) {
      return NextResponse.json({ error: "GLB too large. Keep it under 12MB." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "menu-models");
    await mkdir(uploadDir, { recursive: true });

    const safeBase = getSafeBaseName(file.name).replace(/\.glb$/i, "");
    const uniqueName = `${safeBase}-${crypto.randomUUID()}.glb`;
    const absolutePath = path.join(uploadDir, uniqueName);
    const bytes = Buffer.from(await file.arrayBuffer());

    await writeFile(absolutePath, bytes);

    return NextResponse.json({
      ok: true,
      url: `/uploads/menu-models/${uniqueName}`,
      fileName: file.name,
      size: file.size,
    });
  } catch (err) {
    console.error("model upload error:", err);
    return NextResponse.json({ error: "Failed to upload GLB" }, { status: 500 });
  }
}