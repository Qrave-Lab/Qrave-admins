import { redirect } from "next/navigation";
import { getSessionUserWithRole } from "@/lib/auth/server";

export default async function HomePage() {
  // A stale or forged cookie must not bounce between / and /dashboard.
  if (await getSessionUserWithRole()) {
    redirect("/dashboard");
  }
  redirect("/login");
}
