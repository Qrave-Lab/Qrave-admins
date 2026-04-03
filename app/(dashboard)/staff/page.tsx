// app/(dashboard)/staff/page.tsx
import { db } from "@/lib/db";
import StaffManager from "@/components/StaffManager";
import TopBar from "@/components/TopBar";
import { Suspense } from "react";

async function getRestaurants() {
    try {
        const result = await db.query("SELECT id, name FROM restaurants ORDER BY name");
        return result.rows;
    } catch (e) {
        console.error("Failed to fetch restaurants", e);
        return [];
    }
}

export default async function StaffPage() {
    const restaurants = await getRestaurants();

    return (
        <>
            <TopBar
                title="Staff Management"
                subtitle="Review restaurant staff assignments and update operator access."
            />
            <Suspense fallback={<div className="p-6 space-y-3 animate-pulse">{[1,2,3,4].map(i=><div key={i} className="h-12 bg-slate-100 rounded-xl" />)}</div>}>
                <StaffManager restaurants={restaurants} />
            </Suspense>
        </>
    );
}
