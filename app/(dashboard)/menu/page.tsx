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
            <div className="p-8">
            <Suspense fallback={<div>Loading...</div>}>
                <MenuManager restaurants={restaurants} />
            </Suspense>
            </div>
        </>
    );
}
