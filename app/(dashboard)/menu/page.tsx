// app/(dashboard)/menu/page.tsx
import { db } from "@/lib/db";
import MenuManager from "@/components/MenuManager";
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

export default async function MenuPage() {
    const restaurants = await getRestaurants();

    return (
        <>
            <TopBar
                title="Menu Management"
                subtitle="Inspect and update live menus, categories, 3D assets, and availability."
            />
            <Suspense fallback={<div className="px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">{[1,2,3,4].map(i=><div key={i} className="rounded-2xl bg-slate-100 h-48" />)}</div>}>
                <MenuManager restaurants={restaurants} />
            </Suspense>
        </>
    );
}
