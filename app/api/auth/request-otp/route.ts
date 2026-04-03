import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Legacy OTP admin auth has been removed. Use /api/auth/login instead." },
    { status: 410 },
  );
}
