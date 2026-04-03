// app/(dashboard)/logs/page.tsx
import LogViewer from "@/components/LogViewer";
import TopBar from "@/components/TopBar";
import { Suspense } from "react";

export default function LogsPage() {
    return (
        <>
            <TopBar
                title="Logs & Support"
                subtitle="Monitor staff feedback, incident signals, and downtime events across the platform."
            />
            <div className="p-8">
            <Suspense fallback={<div className="p-6 space-y-3 animate-pulse">{[1,2,3,4,5].map(i=><div key={i} className="h-12 bg-slate-100 rounded-xl" />)}</div>}>
                <LogViewer />
            </Suspense>
            </div>
        </>
    );
}
