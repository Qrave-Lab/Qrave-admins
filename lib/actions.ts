"use server";

import { db } from "@/lib/db";
import { requireSessionEmail } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";

async function assertQAdminSession() {
  const sessionEmail = await requireSessionEmail();
  if (!sessionEmail) {
    throw new Error("Unauthorized");
  }
}

export async function deleteRestaurant(restaurantId: string) {
  await assertQAdminSession();
  try {
    await db.query("DELETE FROM restaurant_users WHERE restaurant_id = $1", [restaurantId]);
    await db.query("DELETE FROM menu_items WHERE restaurant_id = $1", [restaurantId]);
    await db.query("DELETE FROM menu_categories WHERE restaurant_id = $1", [restaurantId]);
    await db.query("DELETE FROM restaurants WHERE id = $1", [restaurantId]);
    revalidatePath("/restaurants");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete restaurant:", error);
    return { success: false, error: "Failed to delete restaurant" };
  }
}

export async function toggleRestaurantStatus(restaurantId: string, isActive: boolean) {
    await assertQAdminSession();
    try {
        await db.query("UPDATE restaurants SET is_active = $1 WHERE id = $2", [isActive, restaurantId]);
        revalidatePath("/restaurants");
        return { success: true };
    } catch (error) {
        console.error("Failed to update restaurant status:", error);
        return { success: false, error: "Failed to update status" };
    }
}



export async function addMenuItem(restaurantId: string, data: any) {
     await assertQAdminSession();
     try {
        const { name, description, price, categoryId, imageUrl, isVeg, modelGlb, isAvailable } = data;
        await db.query(
            `INSERT INTO menu_items 
             (restaurant_id, category_id, name, description, price, image_url, is_veg, model_glb, is_available) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [restaurantId, categoryId, name, description, price, imageUrl, isVeg, modelGlb, isAvailable]
        );
        revalidatePath(`/menu?restaurantId=${restaurantId}`);
        revalidatePath("/menu");
        return { success: true };
    } catch (error) {
         console.error("Failed to add menu item:", error);
         return { success: false, error: "Failed to add menu item" };
    }
}

export async function updateMenuItem(restaurantId: string, itemId: string, data: any) {
    await assertQAdminSession();
    try {
        const { name, description, price, categoryId, imageUrl, isVeg, modelGlb, isAvailable } = data;
        await db.query(
            `UPDATE menu_items 
             SET category_id = $1, name = $2, description = $3, price = $4, image_url = $5, is_veg = $6, model_glb = $7, is_available = $8
             WHERE id = $9 AND restaurant_id = $10`,
            [categoryId, name, description, price, imageUrl, isVeg, modelGlb, isAvailable, itemId, restaurantId]
        );
        revalidatePath(`/menu?restaurantId=${restaurantId}`);
        revalidatePath("/menu");
        return { success: true };
    } catch (error) {
         console.error("Failed to update menu item:", error);
         return { success: false, error: "Failed to update menu item" };
    }
}

export async function deleteMenuItem(itemId: string) {
     await assertQAdminSession();
     try {
        await db.query("DELETE FROM menu_items WHERE id = $1", [itemId]);
        revalidatePath("/menu");
         return { success: true };
    } catch (error) {
         console.error("Failed to delete menu item:", error);
         return { success: false, error: "Failed to delete menu item" };
    }
}



export async function addStaff(restaurantId: string, data: any) {
    await assertQAdminSession();
    try {
        const { email, name, phone, role } = data;
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedName = String(name || "").trim();
        const normalizedPhone = String(phone || "").trim();
        const normalizedRole = String(role || "").trim();

        if (!normalizedEmail || !normalizedName || !normalizedRole) {
            return { success: false, error: "Name, email, and role are required" };
        }
        
        let userId;
        const userRes = await db.query("SELECT id FROM users WHERE lower(email) = $1", [normalizedEmail]);
        if ((userRes.rowCount || 0) > 0) {
            userId = userRes.rows[0].id;
        } else {
             const newUser = await db.query(
                "INSERT INTO users (email, name, phone) VALUES ($1, $2, $3) RETURNING id",
                [normalizedEmail, normalizedName, normalizedPhone || null]
            );
             userId = newUser.rows[0].id;
        }

        const existing = await db.query(
            "SELECT 1 FROM restaurant_users WHERE restaurant_id = $1 AND user_id = $2",
            [restaurantId, userId]
        );
        if ((existing.rowCount || 0) > 0) {
            return { success: false, error: "This user is already assigned to the restaurant" };
        }

        await db.query("INSERT INTO restaurant_users (restaurant_id, user_id, role) VALUES ($1, $2, $3)", [restaurantId, userId, normalizedRole]);
        revalidatePath(`/staff?restaurantId=${restaurantId}`);
        return { success: true };

    } catch (error: any) {
         console.error("Failed to add staff:", error);
        if (error?.code === "23514") {
            return { success: false, error: "Selected role is not supported by the database" };
        }
        if (error?.code === "23505") {
            return { success: false, error: "This email is already in use" };
        }
        return { success: false, error: "Failed to add staff" };
    }
}

export async function updateStaff(restaurantId: string, userId: string, data: any) {
    await assertQAdminSession();
    try {
        const { email, name, phone, role } = data;
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedName = String(name || "").trim();
        const normalizedPhone = String(phone || "").trim();
        const normalizedRole = String(role || "").trim();

        if (!normalizedEmail || !normalizedName || !normalizedRole) {
            return { success: false, error: "Name, email, and role are required" };
        }
        
        await db.query(
            "UPDATE users SET email = $1, name = $2, phone = $3 WHERE id = $4",
            [normalizedEmail, normalizedName, normalizedPhone || null, userId]
        );
        
        await db.query(
            "UPDATE restaurant_users SET role = $1 WHERE user_id = $2 AND restaurant_id = $3",
            [normalizedRole, userId, restaurantId]
        );

        revalidatePath(`/staff?restaurantId=${restaurantId}`);
        return { success: true };

    } catch (error: any) {
         console.error("Failed to update staff:", error);
        if (error?.code === "23514") {
            return { success: false, error: "Selected role is not supported by the database" };
        }
        if (error?.code === "23505") {
            return { success: false, error: "This email is already in use" };
        }
        return { success: false, error: "Failed to update staff" };
    }
}

export async function toggleCoupon(couponId: string, isActive: boolean) {
     await assertQAdminSession();
     try {
        await db.query("UPDATE offer_campaigns SET is_active = $1 WHERE id = $2", [isActive, couponId]);
        revalidatePath("/coupons");
        return { success: true };
    } catch (error) {
         console.error("Failed to toggle coupon:", error);
        return { success: false, error: "Failed to toggle coupon" };
    }

}
