import Sidebar from "@/components/Sidebar";
import { requireAuthPage } from "@/lib/auth/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuthPage();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden min-h-screen pt-[52px] md:pt-0">
        {children}
      </main>
    </div>
  );
}
