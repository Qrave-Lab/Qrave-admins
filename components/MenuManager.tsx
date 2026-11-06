"use client";

import { useMemo, useState } from "react";
import { ImageOff, Loader2, Pencil, Search, Trash2, UtensilsCrossed, X } from "lucide-react";
import { addMenuItem, deleteMenuItem, updateMenuItem } from "@/lib/actions";
import { confirmAction, notify } from "@/lib/ui/feedback";

interface MenuManagerProps {
    restaurants: any[];
}

function ItemImage({ src, alt, dim }: { src?: string; alt: string; dim: boolean }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400">
                <ImageOff size={24} aria-hidden />
                <span className="text-xs font-medium">{src ? "Image unavailable" : "No image"}</span>
            </div>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`h-full w-full object-cover ${dim ? "" : "opacity-50 grayscale"}`} />
    );
}

const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
const label = "mb-1.5 block text-sm font-semibold text-slate-700";

export default function MenuManager({ restaurants }: MenuManagerProps) {
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [hiddenOnly, setHiddenOnly] = useState(false);

    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [newItemDesc, setNewItemDesc] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemImage, setNewItemImage] = useState("");
    const [newItemGlb, setNewItemGlb] = useState("");
    const [isVeg, setIsVeg] = useState(true);
    const [isAvailable, setIsAvailable] = useState(true);
    const [categoryId, setCategoryId] = useState("");

    const selectedRestaurantName = restaurants.find((r: any) => r.id === selectedRestaurant)?.name || "";
    const availableCount = menuItems.filter((i: any) => i.is_available).length;
    const threeDReadyCount = menuItems.filter((i: any) => i.model_glb).length;

    const visibleItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        return menuItems.filter((i: any) => {
            if (hiddenOnly && i.is_available) return false;
            if (categoryFilter === "none" ? i.category_id : categoryFilter !== "all" && i.category_id !== categoryFilter) return false;
            return !q || `${i.name} ${i.description ?? ""}`.toLowerCase().includes(q);
        });
    }, [menuItems, search, categoryFilter, hiddenOnly]);

    const fetchMenu = async (restaurantId: string) => {
        setLoading(true);
        try {
            const [menuRes, catRes] = await Promise.all([
                fetch(`/api/menu?restaurantId=${restaurantId}`),
                fetch(`/api/menu/categories?restaurantId=${restaurantId}`),
            ]);
            if (menuRes.ok) setMenuItems(await menuRes.json());
            if (catRes.ok) setCategories(await catRes.json());
            if (!menuRes.ok) notify.error("Couldn't load this restaurant's menu.");
        } catch (error) {
            console.error("Failed to fetch menu/categories", error);
            notify.error("Couldn't load this restaurant's menu.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setNewItemName(""); setNewItemDesc(""); setNewItemPrice("");
        setNewItemImage(""); setNewItemGlb("");
        setIsVeg(true); setIsAvailable(true); setCategoryId("");
        setEditingItemId(null);
    };

    const handleRestaurantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedRestaurant(id);
        resetForm();
        setSearch("");
        setCategoryFilter("all");
        setHiddenOnly(false);
        if (id) void fetchMenu(id);
        else setMenuItems([]);
    };

    const handleEdit = (item: any) => {
        setEditingItemId(item.id);
        setNewItemName(item.name);
        setNewItemDesc(item.description || "");
        setNewItemPrice(String(item.price ?? ""));
        setNewItemImage(item.image_url || "");
        setNewItemGlb(item.model_glb || "");
        setIsVeg(item.is_veg);
        setIsAvailable(item.is_available);
        setCategoryId(item.category_id || "");
        document.getElementById("item-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurant) return;
        const price = parseFloat(newItemPrice);
        if (!newItemName.trim()) return notify.error("Give the item a name.");
        if (!Number.isFinite(price) || price < 0) return notify.error("Enter a valid price.");
        setSaving(true);
        try {
            const payload = {
                name: newItemName.trim(),
                description: newItemDesc,
                price,
                imageUrl: newItemImage,
                modelGlb: newItemGlb,
                isVeg,
                isAvailable,
                categoryId: categoryId || null,
            };
            if (editingItemId) await updateMenuItem(selectedRestaurant, editingItemId, payload);
            else await addMenuItem(selectedRestaurant, payload);
            notify.success(editingItemId ? `${payload.name} updated.` : `${payload.name} added to the menu.`);
            resetForm();
            await fetchMenu(selectedRestaurant);
        } catch (err) {
            console.error(err);
            notify.error("Couldn't save the item. Nothing was changed.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: any) => {
        const ok = await confirmAction({
            title: `Delete ${item.name}?`,
            message: "It is removed from the menu immediately. This can't be undone.",
            confirmLabel: "Delete item",
        });
        if (!ok) return;
        try {
            await deleteMenuItem(item.id);
            if (editingItemId === item.id) resetForm();
            notify.success(`${item.name} deleted.`);
            if (selectedRestaurant) await fetchMenu(selectedRestaurant);
        } catch {
            notify.error("Couldn't delete the item.");
        }
    };

    const toggleAvailability = async (item: any) => {
        if (!selectedRestaurant) return;
        const next = !item.is_available;
        setTogglingId(item.id);
        setMenuItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)));
        try {
            await updateMenuItem(selectedRestaurant, item.id, {
                name: item.name,
                description: item.description,
                price: item.price,
                imageUrl: item.image_url,
                modelGlb: item.model_glb,
                isVeg: item.is_veg,
                isAvailable: next,
                categoryId: item.category_id || null,
            });
            notify.success(next ? `${item.name} is back on the menu.` : `${item.name} marked sold out.`);
        } catch {
            setMenuItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !next } : i)));
            notify.error("Couldn't change availability.");
        } finally {
            setTogglingId(null);
        }
    };

    const categoryName = (id: string) => categories.find((c: any) => c.id === id)?.name || "Uncategorized";

    return (
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 xl:px-8">
            <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-end">
                <div>
                    <label htmlFor="menu-restaurant" className={label}>Restaurant</label>
                    <select id="menu-restaurant" className={field} value={selectedRestaurant} onChange={handleRestaurantChange}>
                        <option value="">Select a restaurant</option>
                        {restaurants.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>
                {selectedRestaurant && (
                    <dl className="flex flex-wrap items-end gap-x-10 gap-y-3">
                        <div>
                            <dt className="text-xs font-semibold text-slate-500">Items</dt>
                            <dd className="text-2xl font-bold tabular-nums text-slate-900">{menuItems.length}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-slate-500">Available</dt>
                            <dd className="text-2xl font-bold tabular-nums text-emerald-700">{availableCount}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-slate-500">Sold out</dt>
                            <dd className="text-2xl font-bold tabular-nums text-slate-900">{menuItems.length - availableCount}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-slate-500">With 3D model</dt>
                            <dd className="text-2xl font-bold tabular-nums text-slate-900">{threeDReadyCount}</dd>
                        </div>
                    </dl>
                )}
            </div>

            {!selectedRestaurant && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
                    <UtensilsCrossed size={28} className="mb-3 text-slate-300" aria-hidden />
                    <p className="font-semibold text-slate-900">No restaurant selected</p>
                    <p className="mt-1 text-sm text-slate-500">Choose a restaurant to view and edit its menu.</p>
                </div>
            )}

            {selectedRestaurant && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
                    <div className="min-w-0">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1 sm:max-w-sm">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                                <input
                                    aria-label="Search menu items"
                                    className={`${field} pl-10`}
                                    placeholder="Search items"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <select aria-label="Filter by category" className={`${field} sm:w-48`} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                                <option value="all">All categories</option>
                                <option value="none">Uncategorized</option>
                                {categories.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                aria-pressed={hiddenOnly}
                                onClick={() => setHiddenOnly((v) => !v)}
                                className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                                    hiddenOnly ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                Sold out only
                            </button>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-busy="true">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                        <div className="h-40 w-full bg-slate-100" />
                                        <div className="space-y-3 p-4">
                                            <div className="h-5 w-3/4 rounded bg-slate-200" />
                                            <div className="h-4 w-full rounded bg-slate-100" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : visibleItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                                <p className="font-semibold text-slate-900">{menuItems.length === 0 ? "No menu items yet" : "No items match these filters"}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {menuItems.length === 0 ? "Add the first item with the form." : "Try a different search or category."}
                                </p>
                            </div>
                        ) : (
                            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                {visibleItems.map((item: any) => (
                                    <li
                                        key={item.id}
                                        className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white ${
                                            editingItemId === item.id ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
                                        }`}
                                    >
                                        <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-100">
                                            <ItemImage src={item.image_url} alt={item.name} dim={item.is_available} />
                                            <span
                                                className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-xs font-semibold text-white ${
                                                    item.is_veg ? "bg-emerald-600" : "bg-rose-600"
                                                }`}
                                            >
                                                {item.is_veg ? "Veg" : "Non-veg"}
                                            </span>
                                            <span className="absolute right-3 top-3 rounded-lg bg-white px-2.5 py-1 text-sm font-bold tabular-nums text-slate-900 shadow-sm">
                                                ₹{item.price}
                                            </span>
                                        </div>

                                        <div className="flex flex-1 flex-col p-4">
                                            <h3 className="text-base font-bold leading-snug text-slate-900">{item.name}</h3>
                                            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
                                                {item.description || "No description."}
                                            </p>
                                            <p className="mt-3 text-xs font-medium text-slate-500">
                                                {categoryName(item.category_id)}
                                                {item.model_glb && <span className="text-slate-700"> · 3D model</span>}
                                            </p>

                                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={item.is_available}
                                                    aria-label={`${item.name} available`}
                                                    disabled={togglingId === item.id}
                                                    onClick={() => void toggleAvailability(item)}
                                                    className="group inline-flex items-center gap-2 text-sm font-medium text-slate-600 disabled:opacity-60"
                                                >
                                                    <span className={`relative h-5 w-9 rounded-full transition-colors ${item.is_available ? "bg-emerald-600" : "bg-slate-300"}`}>
                                                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left] ${item.is_available ? "left-[18px]" : "left-0.5"}`} />
                                                    </span>
                                                    {item.is_available ? "Available" : "Sold out"}
                                                </button>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(item)}
                                                        aria-label={`Edit ${item.name}`}
                                                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDelete(item)}
                                                        aria-label={`Delete ${item.name}`}
                                                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <form
                        id="item-form"
                        onSubmit={handleSubmit}
                        aria-label={editingItemId ? "Edit menu item" : "Add menu item"}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:sticky xl:top-6"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-slate-900">{editingItemId ? "Edit item" : "Add item"}</h2>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    {editingItemId ? `Changes apply to ${selectedRestaurantName || "this restaurant"} straight away.` : `New items go live on ${selectedRestaurantName || "the menu"}.`}
                                </p>
                            </div>
                            {editingItemId && (
                                <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                                    <X size={14} aria-hidden /> Cancel
                                </button>
                            )}
                        </div>

                        <div className="space-y-4 px-5 py-5">
                            <div>
                                <label htmlFor="item-name" className={label}>Name</label>
                                <input id="item-name" className={field} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Margherita pizza" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="item-price" className={label}>Price (₹)</label>
                                    <input id="item-price" type="number" min={0} step="0.01" inputMode="decimal" className={`${field} tabular-nums`} value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} placeholder="0" />
                                </div>
                                <div>
                                    <label htmlFor="item-category" className={label}>Category</label>
                                    <select id="item-category" className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                        <option value="">None</option>
                                        {categories.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="item-desc" className={label}>Description</label>
                                <textarea id="item-desc" rows={3} className={`${field} resize-none leading-relaxed`} value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} placeholder="A short description" />
                            </div>

                            <fieldset>
                                <legend className={label}>Options</legend>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        aria-pressed={isVeg}
                                        onClick={() => setIsVeg(!isVeg)}
                                        className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${isVeg ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        {isVeg ? "Vegetarian" : "Non-vegetarian"}
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={isAvailable}
                                        onClick={() => setIsAvailable(!isAvailable)}
                                        className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${isAvailable ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        {isAvailable ? "Available" : "Sold out"}
                                    </button>
                                </div>
                            </fieldset>

                            <div>
                                <label htmlFor="item-image" className={label}>Image URL</label>
                                <input id="item-image" type="url" className={`${field} mb-3`} value={newItemImage} onChange={(e) => setNewItemImage(e.target.value)} placeholder="https://…" />
                                <label htmlFor="item-glb" className={label}>3D model URL (.glb)</label>
                                <input id="item-glb" type="url" className={field} value={newItemGlb} onChange={(e) => setNewItemGlb(e.target.value)} placeholder="https://…" />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
                            >
                                {saving && <Loader2 size={15} className="animate-spin" aria-hidden />}
                                {saving ? "Saving…" : editingItemId ? "Save changes" : "Add item"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
