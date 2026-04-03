"use client";

import { useState, useEffect } from "react";
import { toggleCoupon } from "@/lib/actions";

interface Coupon {
    id: string;
    name: string;
    code: string;
    discount_value: number;
    is_active: boolean;
    restaurant_name: string;
    redemption_count: number;
}

export default function CouponManager() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/coupons');
            if (res.ok) {
                setCoupons(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleToggle = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            await toggleCoupon(id, newStatus);
            // Optimistic update or refresh
            setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: newStatus } : c));
        } catch (error) {
            alert("Failed to update coupon status");
        }
    };

    if (loading) return <div>Loading coupons...</div>;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name/Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Redemptions</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {coupons.map((coupon) => (
                        <tr key={coupon.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{coupon.name}</div>
                                <div className="text-sm text-gray-500">{coupon.code}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {coupon.restaurant_name || "Global / Unknown"}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {coupon.discount_value}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {coupon.redemption_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {coupon.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button 
                                    onClick={() => handleToggle(coupon.id, coupon.is_active)}
                                    className={`text-indigo-600 hover:text-indigo-900 font-bold`}
                                >
                                    {coupon.is_active ? 'Disable' : 'Enable'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
