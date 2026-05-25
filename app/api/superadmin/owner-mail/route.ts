import { proxyToBackend } from "@/lib/superadmin/proxy";

export async function POST(request: Request) {
  return proxyToBackend({
    path: "/api/superadmin/owner-mail/send",
    request,
    method: "POST",
  });
}