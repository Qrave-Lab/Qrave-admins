import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";

type ProxyOptions = {
  path: string;
  request: Request;
  method?: "GET" | "PATCH" | "POST" | "PUT" | "DELETE";
  /** Body already read from the request. When omitted, the request body is read here. */
  body?: string;
};

/**
 * Forwards a request to the Go API's superadmin routes with the server-side
 * API key. Callers must check permissions first; this only checks that an
 * admin is signed in.
 */
export async function proxyToBackend(options: ProxyOptions): Promise<Response> {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  const baseURL = String(process.env.SUPERADMIN_BACKEND_URL || "").trim();
  const apiKey = String(process.env.SUPERADMIN_API_KEY || "").trim();
  if (!baseURL || !apiKey) {
    return NextResponse.json({ error: "Qrave API is not configured on this server (SUPERADMIN_BACKEND_URL / SUPERADMIN_API_KEY)." }, { status: 503 });
  }

  const sessionEmail = await requireSessionEmail();
  const url = new URL(options.request.url);
  const target = `${baseURL.replace(/\/$/, "")}${options.path}${url.search || ""}`;
  const method = options.method || (options.request.method as ProxyOptions["method"]) || "GET";
  const headers: Record<string, string> = {
    "x-superadmin-key": apiKey,
    accept: "application/json",
  };
  if (sessionEmail) headers["x-superadmin-actor"] = sessionEmail;

  let body: string | undefined;
  if (method !== "GET" && method !== "DELETE") {
    const raw = options.body ?? (await options.request.text());
    if (raw) {
      body = raw;
      headers["content-type"] = "application/json";
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    console.error("Qrave API request failed:", options.path, err);
    return NextResponse.json({ error: "Couldn't reach the Qrave API. Try again in a moment." }, { status: 502 });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}
