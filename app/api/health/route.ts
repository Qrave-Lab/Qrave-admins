import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "qrave-superadmin", timestamp: new Date().toISOString() });
}
