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
            <Suspense fallback={<div>Loading logs...</div>}>
                <LogViewer />
            </Suspense>
            </div>
        </>
    );
}
