import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";

type ProxyOptions = {
  path: string;
  request: Request;
  method?: "GET" | "PATCH" | "POST" | "PUT" | "DELETE";
};

export async function proxyToBackend(options: ProxyOptions): Promise<Response> {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  const baseURL = String(
    process.env.NEXT_PUBLIC_SUPERADMIN_API_URL || process.env.SUPERADMIN_BACKEND_URL || "",
  ).trim();
  const apiKey = String(process.env.SUPERADMIN_API_KEY || "").trim();
  if (!baseURL || !apiKey) {
    return NextResponse.json(
      { error: "superadmin backend not configured" },
      { status: 503 },
    );
  }

  const sessionEmail = await requireSessionEmail();
  const url = new URL(options.request.url);
  const target = `${baseURL.replace(/\/$/, "")}${options.path}${url.search || ""}`;
  const method = options.method || options.request.method;
  const headers: Record<string, string> = {
    "x-superadmin-key": apiKey,
    accept: "application/json",
  };
  if (sessionEmail) headers["x-superadmin-actor"] = sessionEmail;

  const forwardedCookie = options.request.headers.get("cookie");
  if (forwardedCookie) headers.cookie = forwardedCookie;

  const csrfHeader = options.request.headers.get("x-csrf-token");
  if (csrfHeader) headers["x-csrf-token"] = csrfHeader;

  let body: string | undefined;
  if (method !== "GET" && method !== "DELETE") {
    const raw = await options.request.text();
    if (raw) {
      body = raw;
      headers["content-type"] = "application/json";
    }
  }

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}

