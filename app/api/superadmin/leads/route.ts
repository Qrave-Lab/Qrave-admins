import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { rows } = await db.query(
      `SELECT id, name, email, phone, restaurant_name AS "restaurantName", created_at AS "createdAt"
       FROM contact_requests
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("fetch contact requests error:", err);
    return NextResponse.json({ error: "failed to fetch contact requests" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    await db.query("DELETE FROM contact_requests WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete contact request error:", err);
    return NextResponse.json({ error: "failed to delete contact request" }, { status: 500 });
  }
}
