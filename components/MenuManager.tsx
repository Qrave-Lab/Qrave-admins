"use client";

import { useState } from "react";
import { addMenuItem, deleteMenuItem, updateMenuItem } from "@/lib/actions";

interface MenuManagerProps {
    restaurants: any[];
}

export default function MenuManager({ restaurants }: MenuManagerProps) {
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form states
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [newItemDesc, setNewItemDesc] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemImage, setNewItemImage] = useState("");
    const [newItemGlb, setNewItemGlb] = useState("");
    const [isVeg, setIsVeg] = useState(true);
    const [isAvailable, setIsAvailable] = useState(true);
    const [categoryId, setCategoryId] = useState(""); 

    const fetchMenu = async (restaurantId: string) => {
        setLoading(true);
        try {
             const [menuRes, catRes] = await Promise.all([
                fetch(`/api/menu?restaurantId=${restaurantId}`),
                fetch(`/api/menu/categories?restaurantId=${restaurantId}`)
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
        setNewItemName(""); setNewItemDesc(""); setNewItemPrice(""); 
        setNewItemImage(""); setNewItemGlb("");
        setIsVeg(true); setIsAvailable(true); setCategoryId("");
        setEditingItemId(null);
    };

    const handleEdit = (item: any) => {
        setEditingItemId(item.id);
        setNewItemName(item.name);
        setNewItemDesc(item.description || "");
        setNewItemPrice(item.price);
        setNewItemImage(item.image_url || "");
        setNewItemGlb(item.model_glb || "");
        setIsVeg(item.is_veg);
        setIsAvailable(item.is_available);
        setCategoryId(item.category_id || "");
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
                isVeg: isVeg,
                isAvailable: isAvailable,
                categoryId: categoryId || null 
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
    }

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure?")) {
            await deleteMenuItem(id);
            if (selectedRestaurant) fetchMenu(selectedRestaurant);
        }
    }

    return (
        <div>
            <div className="mb-8 max-w-md relative">
                <label className="block mb-2 text-sm font-bold text-slate-800 uppercase tracking-wider">Select Restaurant</label>
                <div className="relative">
                    <select 
                        className="w-full appearance-none p-3.5 px-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold shadow-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all cursor-pointer"
                        value={selectedRestaurant}
                        onChange={handleRestaurantChange}
                        style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2364748b" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                    >
                        <option value="" disabled hidden>-- Select Restaurant --</option>
                        {restaurants.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedRestaurant && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                     {/* List */}
                    <div className="xl:col-span-2 space-y-5">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Menu Items <span className="text-slate-400 font-medium ml-2 text-lg">({menuItems.length})</span></h2>
                        </div>
                        
                        {loading ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="animate-pulse bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="aspect-video bg-slate-100 w-full" />
                                        <div className="p-5">
                                            <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
                                            <div className="h-4 w-full bg-slate-100 rounded mb-2" />
                                            <div className="h-4 w-5/6 bg-slate-100 rounded mb-5" />
                                            <div className="border-t border-slate-50 pt-4 flex justify-between">
                                                <div className="h-3 w-20 bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {menuItems.map((item: any) => (
                                    <div key={item.id} className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all group delay-75">
                                        <div className="aspect-video w-full bg-slate-100 relative">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-sm">No Image</div>
                                            )}
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-black rounded-lg shadow-sm border ${item.is_veg ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                    {item.is_veg ? 'VEG' : 'NON-VEG'}
                                                </span>
                                                 {!item.is_available && (
                                                    <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest font-black rounded-lg shadow-sm bg-slate-800 text-white border border-slate-700">
                                                        Sold Out
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-2 gap-4">
                                                <h3 className="font-bold text-lg leading-tight text-slate-900">{item.name}</h3>
                                                <span className="font-black text-slate-900 shrink-0 bg-slate-100 px-2 py-1 rounded-md text-sm border border-slate-200">₹{item.price}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{item.description || "No description provided."}</p>
                                            
                                            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 border-t border-slate-100 pt-4">
                                                 <span className="uppercase tracking-wider">Cat: <span className="text-slate-800">{categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}</span></span>
                                                 {item.model_glb && <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">3D Ready</span>}
                                            </div>

                                            <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 bg-white text-slate-700 rounded-xl shadow-md border hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                                    title="Edit Item"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 bg-white text-rose-600 rounded-xl shadow-md border hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                                    title="Delete Item"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {menuItems.length === 0 && (
                                    <div className="col-span-full py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border-dashed border-2 border-slate-200">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">No menu items found</h3>
                                        <p className="text-sm">Add your first item to get started.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Add Form */}
                    <div className="bg-white p-6 rounded-xl shadow-md border h-fit sticky top-6">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-lg font-bold text-gray-800">{editingItemId ? 'Edit Item' : 'Add New Item'}</h2>
                            {editingItemId && (
                                <button onClick={resetForm} className="text-xs text-gray-500 underline hover:text-gray-800">Cancel</button>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                <input 
                                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="e.g. Margherita Pizza"
                                />
                            </div>
                            
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Price (₹)</label>
                                    <input 
                                        type="number"
                                        className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                        value={newItemPrice}
                                        onChange={(e) => setNewItemPrice(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                                    <select 
                                        className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                    >
                                        <option value="">None</option>
                                        {categories.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                <textarea 
                                    rows={3}
                                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                                    value={newItemDesc}
                                    onChange={(e) => setNewItemDesc(e.target.value)}
                                    placeholder="Brief description of the item"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Configuration</label>
                                <div className="flex gap-4 p-3 bg-gray-50 rounded border">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                            checked={isVeg}
                                            onChange={(e) => setIsVeg(e.target.checked)}
                                        />
                                        <span className="text-gray-700">Veg</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                            checked={isAvailable}
                                            onChange={(e) => setIsAvailable(e.target.checked)}
                                        />
                                        <span className="text-gray-700">Available</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Media</label>
                                <input 
                                    className="w-full p-2 mb-2 border rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={newItemImage}
                                    onChange={(e) => setNewItemImage(e.target.value)}
                                    placeholder="Image URL (https://...)"
                                />
                                <input 
                                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={newItemGlb}
                                    onChange={(e) => setNewItemGlb(e.target.value)}
                                    placeholder="3D Model URL (.glb)"
                                />
                            </div>

                            <button 
                                onClick={handleSubmit}
                                className={`w-full text-white p-2.5 rounded-lg font-medium transition-colors shadow-lg ${editingItemId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20' : 'bg-slate-900 hover:bg-black shadow-blue-500/20'}`}
                            >
                                {editingItemId ? 'Update Item' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
