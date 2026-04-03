"use client";

import { useState, useEffect } from "react";
import { addStaff, updateStaff } from "@/lib/actions";

interface Restaurant {
  id: string;
  name: string;
}

interface Staff {
  id: string; 
  name: string; 
  email: string;
  phone: string; 
  role: string;
  restaurant_id: string;
}

export default function StaffManager({ restaurants }: { restaurants: Restaurant[] }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("staff");

  const fetchStaff = async (restaurantId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff?restaurantId=${restaurantId}`);
      if (res.ok) {
        setStaffList(await res.json());
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedRestaurant(id);
    resetForm();
    if (id) fetchStaff(id);
    else setStaffList([]);
  };

  const resetForm = () => {
    setNewStaffName("");
    setNewStaffEmail("");
    setNewStaffPhone("");
    setNewStaffRole("staff");
    setEditingStaffId(null);
  }

  const handleEdit = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setNewStaffName(staff.name);
    setNewStaffEmail(staff.email);
    setNewStaffPhone(staff.phone);
    setNewStaffRole(staff.role);
  };


  const handleSubmit = async () => {
    if (!selectedRestaurant) return;
    try {
      if (editingStaffId) {
          await updateStaff(selectedRestaurant, editingStaffId, {
            name: newStaffName,
            email: newStaffEmail,
            phone: newStaffPhone,
            role: newStaffRole,
          });
      } else {
          await addStaff(selectedRestaurant, {
            name: newStaffName,
            email: newStaffEmail,
            phone: newStaffPhone,
            role: newStaffRole,
          });
      }
      
      fetchStaff(selectedRestaurant);
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Failed to save staff member");
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Restaurant</label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          value={selectedRestaurant}
          onChange={handleRestaurantChange}
        >
          <option value="">-- Choose a Restaurant --</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {selectedRestaurant && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Staff List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Current Staff</h3>
            </div>
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {staffList.map((staff) => (
                  <li key={staff.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 group">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-indigo-600 truncate">{staff.name}</div>
                      <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 capitalize">
                          {staff.role}
                        </span>
                        <button 
                            onClick={() => handleEdit(staff)}
                            className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                             </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500 mr-4">
                          {staff.email}
                        </p>
                        <p className="flex items-center text-sm text-gray-500">
                           {staff.phone}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
                {staffList.length === 0 && (
                  <li className="p-4 text-center text-gray-500 text-sm">No staff members found.</li>
                )}
              </ul>
            )}
          </div>

          {/* Add/Edit Staff Form */}
          <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{editingStaffId ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
                 {editingStaffId && (
                    <button onClick={resetForm} className="text-xs text-gray-500 underline hover:text-gray-800">Cancel</button>
                )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="chef">Chef</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${editingStaffId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-black'}`}
              >
                {editingStaffId ? 'Update Staff Member' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
