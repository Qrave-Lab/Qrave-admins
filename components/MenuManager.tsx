"use client";

import { useRef, useState } from "react";
import { addMenuItem, deleteMenuItem, updateMenuItem } from "@/lib/actions";

interface MenuManagerProps {
  restaurants: any[];
}

export default function MenuManager({ restaurants }: MenuManagerProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemImage, setNewItemImage] = useState("");
  const [newItemGlb, setNewItemGlb] = useState("");
  const [newItemGlbName, setNewItemGlbName] = useState("");
  const [modelUploading, setModelUploading] = useState(false);
  const [isVeg, setIsVeg] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const modelInputRef = useRef<HTMLInputElement | null>(null);

  const selectedRestaurantName =
    restaurants.find((restaurant: any) => restaurant.id === selectedRestaurant)
      ?.name || "";
  const availableCount = menuItems.filter(
    (item: any) => item.is_available,
  ).length;
  const threeDReadyCount = menuItems.filter(
    (item: any) => item.model_glb,
  ).length;

  const fetchMenu = async (restaurantId: string) => {
    setLoading(true);
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch(`/api/menu?restaurantId=${restaurantId}`),
        fetch(`/api/menu/categories?restaurantId=${restaurantId}`),
      ]);
      if (menuRes.ok) setMenuItems(await menuRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (error) {
      console.error("Failed to fetch menu/categories", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedRestaurant(id);
    setEditingItemId(null);
    resetForm();
    if (id) fetchMenu(id);
    else setMenuItems([]);
  };

  const resetForm = () => {
    setNewItemName("");
    setNewItemDesc("");
    setNewItemPrice("");
    setNewItemImage("");
    setNewItemGlb("");
    setNewItemGlbName("");
    setIsVeg(true);
    setIsAvailable(true);
    setCategoryId("");
    setEditingItemId(null);
  };

  const getAssetLabel = (url: string) => {
    if (!url) return "";
    try {
      const clean = String(url).split("?")[0].split("#")[0];
      const parts = clean.split("/").filter(Boolean);
      return parts[parts.length - 1] || "";
    } catch {
      return url;
    }
  };

  const handleEdit = (item: any) => {
    setEditingItemId(item.id);
    setNewItemName(item.name);
    setNewItemDesc(item.description || "");
    setNewItemPrice(item.price);
    setNewItemImage(item.image_url || "");
    setNewItemGlb(item.model_glb || "");
    setNewItemGlbName(getAssetLabel(item.model_glb || ""));
    setIsVeg(item.is_veg);
    setIsAvailable(item.is_available);
    setCategoryId(item.category_id || "");
  };

  const handleModelUpload = async (file: File) => {
    if (!file) return;
    const isGlb =
      file.name.toLowerCase().endsWith(".glb") ||
      file.type === "model/gltf-binary";
    if (!isGlb) {
      alert("Please choose a .glb file");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      alert("GLB too large. Keep it under 12MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setModelUploading(true);
    try {
      const res = await fetch("/api/uploads/menu-model", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Model upload failed");
      }

      setNewItemGlb(data.url || "");
      setNewItemGlbName(data.fileName || file.name);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Model upload failed");
    } finally {
      setModelUploading(false);
      if (modelInputRef.current) modelInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedRestaurant) return;
    try {
      const payload = {
        name: newItemName,
        description: newItemDesc,
        price: parseFloat(newItemPrice),
        imageUrl: newItemImage,
        modelGlb: newItemGlb,
        isVeg,
        isAvailable,
        categoryId: categoryId || null,
      };
      if (editingItemId) {
        await updateMenuItem(selectedRestaurant, editingItemId, payload);
      } else {
        await addMenuItem(selectedRestaurant, payload);
      }
      fetchMenu(selectedRestaurant);
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Failed to save item");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      await deleteMenuItem(id);
      if (selectedRestaurant) fetchMenu(selectedRestaurant);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 xl:px-8">
      {/* Restaurant Selector */}
      <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_1fr] xl:items-center">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Select Restaurant
            </label>
            <select
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
              value={selectedRestaurant}
              onChange={handleRestaurantChange}
              style={{
                backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2364748b" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>')`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "1rem",
              }}
            >
              <option value="" disabled hidden>
                -- Select a Restaurant --
              </option>
              {restaurants.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Catalog
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {menuItems.length}
              </p>
              <p className="text-sm text-slate-500">total items</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                Live
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-emerald-900">
                {availableCount}
              </p>
              <p className="text-sm text-emerald-700">available now</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">
                3D Assets
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-indigo-900">
                {threeDReadyCount}
              </p>
              <p className="text-sm text-indigo-700">items with models</p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!selectedRestaurant && (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" />
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">
            No restaurant selected
          </p>
          <p className="text-sm text-slate-400">
            Choose a restaurant above to manage its menu
          </p>
        </div>
      )}

      {selectedRestaurant && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_400px] xl:items-start">
          {/* ── Menu List ── */}
          <div className="flex-1 min-w-0">
            <div className="mb-5 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Menu Board
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                    {selectedRestaurantName || "Restaurant"} menu items
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {menuItems.length} item{menuItems.length !== 1 ? "s" : ""}{" "}
                    listed across the live menu catalog.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                    {categories.length} categories
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                    {menuItems.length - availableCount} hidden
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="h-44 bg-slate-100 w-full" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 w-3/4 bg-slate-200 rounded" />
                      <div className="h-4 w-full bg-slate-100 rounded" />
                      <div className="h-4 w-2/3 bg-slate-100 rounded" />
                      <div className="flex justify-between pt-2 border-t border-slate-50">
                        <div className="h-3 w-20 bg-slate-100 rounded" />
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : menuItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  No menu items yet
                </p>
                <p className="text-sm text-slate-400">
                  Add your first item using the form →
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {menuItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/70"
                  >
                    {/* Image area */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100 shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                          <span className="text-xs font-medium">No image</span>
                        </div>
                      )}

                      {/* Top-left: Veg/Non-Veg + Availability */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-black rounded-md shadow-sm ${item.is_veg ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
                        >
                          {item.is_veg ? "Veg" : "Non-Veg"}
                        </span>
                        {!item.is_available && (
                          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-black rounded-md bg-slate-800 text-white shadow-sm">
                            Sold Out
                          </span>
                        )}
                      </div>

                      {/* Top-right: Price */}
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 text-sm font-black rounded-lg bg-white/95 backdrop-blur-sm text-slate-900 shadow-sm">
                          ₹{item.price}
                        </span>
                      </div>

                      {/* Hover overlay: edit/delete */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-end p-3">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 bg-white text-slate-700 rounded-xl shadow-md hover:bg-slate-50 transition-colors"
                            title="Edit"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-white text-rose-500 rounded-xl shadow-md hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="mb-1.5 text-lg font-black leading-snug text-slate-900">
                        {item.name}
                      </h3>
                      <p className="min-h-[2.75rem] text-sm leading-relaxed text-slate-500 line-clamp-2">
                        {item.description || "No description provided."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-600">
                          {categories.find(
                            (c: any) => c.id === item.category_id,
                          )?.name || "Uncategorized"}
                        </span>
                        {item.model_glb && (
                          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                            3D Ready
                          </span>
                        )}
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-semibold text-slate-500">
                          {item.is_available
                            ? "Visible in menu"
                            : "Hidden from menu"}
                        </span>
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          Edit Item
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Add / Edit Form ── */}
          <div className="xl:min-w-0">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm xl:sticky xl:top-28">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Item Studio
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    {editingItemId ? "Edit Item" : "Add New Item"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {editingItemId
                      ? "Update item details and availability"
                      : "Fill in the details below"}
                  </p>
                </div>
                {editingItemId && (
                  <button
                    onClick={resetForm}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                  >
                    ✕ Cancel
                  </button>
                )}
              </div>

              <div className="px-6 py-5 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Item Name
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 bg-white"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Margherita Pizza"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all bg-white"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      Category
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all cursor-pointer bg-white"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">None</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all resize-none placeholder:text-slate-300 bg-white leading-relaxed"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
                    Configuration
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsVeg(!isVeg)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${isVeg ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${isVeg ? "bg-white" : "bg-slate-300"}`}
                      />
                      Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAvailable(!isAvailable)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${isAvailable ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${isAvailable ? "bg-white" : "bg-slate-300"}`}
                      />
                      Available
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Media URLs
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 mb-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 bg-white"
                    value={newItemImage}
                    onChange={(e) => setNewItemImage(e.target.value)}
                    placeholder="Image URL (https://...)"
                  />
                  <input
                    className="w-full px-3.5 py-2.5 mb-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 bg-white"
                    value={newItemGlb}
                    onChange={(e) => {
                      setNewItemGlb(e.target.value);
                      setNewItemGlbName(getAssetLabel(e.target.value));
                    }}
                    placeholder="3D Model URL (.glb)"
                  />
                  <input
                    ref={modelInputRef}
                    type="file"
                    accept=".glb,model/gltf-binary"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleModelUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => modelInputRef.current?.click()}
                    disabled={modelUploading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-slate-900 transition-all hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {modelUploading
                      ? "Uploading 3D model..."
                      : newItemGlbName
                        ? `GLB uploaded: ${newItemGlbName}`
                        : "Upload 3D Model (.glb)"}
                  </button>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Paste a direct .glb URL or upload a file. The saved model URL will be used either way.
                  </p>
                  {newItemGlb ? (
                    <p className="mt-2 text-[11px] text-emerald-600 font-semibold break-all">
                      Saved model URL: {newItemGlb}
                    </p>
                  ) : null}
                </div>

                <button
                  onClick={handleSubmit}
                  className={`w-full text-white py-3 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98] ${editingItemId ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-black"}`}
                >
                  {editingItemId ? "✓ Update Item" : "+ Add Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
