import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionEmail, requirePermissionJson } from "@/lib/auth/server";
import bcrypt from "bcryptjs";
import { recordAuditLog } from "@/lib/audit";
import { dinerBaseUrl } from "@/lib/dinerUrl";
import { ensureTableQrTokens, tableQrUrl } from "@/lib/tableQr";

interface MenuItemSeed {
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  categoryName: string;
}

const MENU_TEMPLATES: Record<string, { categories: string[]; items: MenuItemSeed[] }> = {
  cafe: {
    categories: ["Signature Coffees", "Breakfast & Sandwiches", "Desserts & Pastries"],
    items: [
      { name: "Classic Cappuccino", description: "Rich double shot espresso with velvety micro-foam milk", price: 180, isVeg: true, categoryName: "Signature Coffees" },
      { name: "Iced Vanilla Latte", description: "Chilled espresso, Madagascar vanilla syrup, and creamy milk over ice", price: 220, isVeg: true, categoryName: "Signature Coffees" },
      { name: "Avocado Sourdough Toast", description: "Crushed Hass avocado, cherry tomatoes, feta crumble, and toasted seeds", price: 280, isVeg: true, categoryName: "Breakfast & Sandwiches" },
      { name: "Grilled Chicken Pesto Panini", description: "Herb roasted chicken, house basil pesto, sun-dried tomatoes, melted mozzarella", price: 320, isVeg: false, categoryName: "Breakfast & Sandwiches" },
      { name: "Warm Belgian Waffle", description: "Crisp golden waffle served with maple syrup, whipped cream, and berries", price: 240, isVeg: true, categoryName: "Desserts & Pastries" },
    ],
  },
  fast_food: {
    categories: ["Burgers & Wraps", "Loaded Fries", "Thick Shakes"],
    items: [
      { name: "Crispy Double Smash Cheeseburger", description: "Twin smashed patties, aged cheddar, caramelized onions, signature secret sauce", price: 249, isVeg: false, categoryName: "Burgers & Wraps" },
      { name: "Spiced Paneer Tikka Burger", description: "Crispy tandoori paneer patty, mint mayonnaise, crunchy lettuce in brioche bun", price: 199, isVeg: true, categoryName: "Burgers & Wraps" },
      { name: "Truffle Parmesan Loaded Fries", description: "Golden skin-on french fries tossed in black truffle oil, garlic herbs & parmesan", price: 179, isVeg: true, categoryName: "Loaded Fries" },
      { name: "Peri Peri Chicken Tenders", description: "Juicy buttermilk fried chicken tenders dusted with African birds eye peri-peri", price: 219, isVeg: false, categoryName: "Burgers & Wraps" },
      { name: "Belgian Chocolate Thickshake", description: "Dense, artisanal chocolate shake topped with dark chocolate ganache", price: 169, isVeg: true, categoryName: "Thick Shakes" },
    ],
  },
  indian_fine_dining: {
    categories: ["Starters & Kebabs", "Main Course Curries", "Artisan Breads & Biryanis"],
    items: [
      { name: "Dahi Ke Kebab", description: "Silky hung curd patties flavored with cardamom, coriander, and golden shallots", price: 295, isVeg: true, categoryName: "Starters & Kebabs" },
      { name: "Smoked Galouti Kebab", description: "Mouth-melting minced lamb kebabs infused with 24 aromatic Awadhi spices", price: 395, isVeg: false, categoryName: "Starters & Kebabs" },
      { name: "Old Delhi Butter Chicken", description: "Clay-oven smoked chicken simmered in a velvety tomato and cashew butter gravy", price: 445, isVeg: false, categoryName: "Main Course Curries" },
      { name: "Dal Makhani Bukhara Style", description: "Black lentils slow-cooked for 18 hours on charcoal with cream and white butter", price: 345, isVeg: true, categoryName: "Main Course Curries" },
      { name: "Awadhi Murgh Dum Biryani", description: "Fragrant aged basmati rice layered with tender spiced chicken and saffron", price: 425, isVeg: false, categoryName: "Artisan Breads & Biryanis" },
      { name: "Garlic Butter Naan", description: "Traditional tandoor-baked leavened flatbread brushed with garlic butter", price: 95, isVeg: true, categoryName: "Artisan Breads & Biryanis" },
    ],
  },
  pizzeria: {
    categories: ["Neapolitan Pizzas", "Handmade Pastas", "Beverages & Mocktails"],
    items: [
      { name: "Margherita Con Bufala", description: "San Marzano tomato base, fresh buffalo mozzarella, fresh basil, extra virgin olive oil", price: 420, isVeg: true, categoryName: "Neapolitan Pizzas" },
      { name: "Spiced Pepperoni & Hot Honey", description: "Artisan pepperoni, fior di latte mozzarella, hot chili infused wildflower honey", price: 540, isVeg: false, categoryName: "Neapolitan Pizzas" },
      { name: "Truffle Funghi e Formaggio", description: "Creamy wild mushroom ragu, fontina cheese, thyme, white truffle drizzle", price: 480, isVeg: true, categoryName: "Neapolitan Pizzas" },
      { name: "Creamy Rigatoni Alla Vodka", description: "Handcrafted rigatoni in a rich tomato, garlic, and cream sauce with pecorino", price: 390, isVeg: true, categoryName: "Handmade Pastas" },
      { name: "Passionfruit Basil Cooler", description: "Refreshing blend of muddled sweet basil, passionfruit pulp, lime, and sparkling soda", price: 190, isVeg: true, categoryName: "Beverages & Mocktails" },
    ],
  },
  blank: {
    categories: ["Starters", "Mains", "Beverages"],
    items: [],
  },
};

export async function POST(request: Request) {
  const unauthorized = await requirePermissionJson("restaurants.status");
  if (unauthorized) return unauthorized;

  const client = await db.connect();
  try {
    const actor = (await requireSessionEmail()) || "superadmin";
    const body = await request.json();

    const {
      brandName,
      locationName = "",
      currency = "INR",
      plan = "pro",
      ownerEmail,
      ownerPassword,
      tableCount = 15,
      sections = ["Main Dining", "Terrace"],
      menuTemplate = "cafe",
      trialDays = 14,
    } = body;

    if (!brandName?.trim() || !ownerEmail?.trim() || !ownerPassword?.trim()) {
      return NextResponse.json(
        { error: "Brand name, owner email, and owner password are required." },
        { status: 400 },
      );
    }

    const cleanTableCount = Math.min(Math.max(Number(tableCount) || 12, 1), 100);
    const validSections = Array.isArray(sections) && sections.length > 0
      ? sections.map((s: string) => s.trim()).filter(Boolean)
      : ["Main Dining"];

    await client.query("BEGIN");

    // 1. Create or retrieve owner user
    const hash = await bcrypt.hash(ownerPassword, 10);
    const cleanEmail = ownerEmail.trim().toLowerCase();

    let userId: string;
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    } else {
      const userRes = await client.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
        [cleanEmail, hash],
      );
      userId = userRes.rows[0].id;
    }

    // 2. Create Restaurant
    const fullName = locationName.trim()
      ? `${brandName.trim()} - ${locationName.trim()}`
      : brandName.trim();

    const trialEndInterval = `${Math.max(Number(trialDays) || 14, 1)} days`;

    const restRes = await client.query(
      `
      INSERT INTO restaurants (
        name, currency, address, subscription_plan, subscription_status, billing_provider,
        trial_started_at, trial_ends_at, billing_updated_at
      ) VALUES ($1, $2, $3, $4, 'trialing', 'razorpay', NOW(), NOW() + interval '${trialEndInterval}', NOW())
      RETURNING id, name, currency
      `,
      [
        fullName,
        currency.trim().toUpperCase(),
        locationName.trim() || null,
        plan.toLowerCase(),
      ],
    );

    const restaurant = restRes.rows[0];
    const restaurantId = restaurant.id;

    // 3. Link owner
    await client.query(
      `
      INSERT INTO restaurant_users (restaurant_id, user_id, role)
      VALUES ($1, $2, 'owner')
      ON CONFLICT DO NOTHING
      `,
      [restaurantId, userId],
    );

    // 4. Provision Tables with Section Mapping
    const tablesCreated: Array<{ id: string; tableNumber: number; floorName: string }> = [];
    const tablesPerSection = Math.ceil(cleanTableCount / validSections.length);

    for (let tableNum = 1; tableNum <= cleanTableCount; tableNum++) {
      const sectionIdx = Math.min(
        Math.floor((tableNum - 1) / tablesPerSection),
        validSections.length - 1,
      );
      const floorName = validSections[sectionIdx];

      const tRes = await client.query(
        `
        INSERT INTO restaurant_tables (restaurant_id, table_number, floor_name, capacity, is_enabled)
        VALUES ($1, $2, $3, 4, true)
        RETURNING id, table_number, floor_name
        `,
        [restaurantId, tableNum, floorName],
      );
      tablesCreated.push({
        id: tRes.rows[0].id,
        tableNumber: tRes.rows[0].table_number,
        floorName: tRes.rows[0].floor_name,
      });
    }

    // Each table gets its QR token now, so the QR pack shown next works.
    const qrTokens = await ensureTableQrTokens(client, restaurantId, tablesCreated.map((t) => t.id));

    // 5. Seed Starter Menu Template
    const templateData = MENU_TEMPLATES[menuTemplate] || MENU_TEMPLATES.cafe;
    const catMap = new Map<string, string>();

    for (const catName of templateData.categories) {
      const catRes = await client.query(
        `
        INSERT INTO menu_categories (restaurant_id, name)
        VALUES ($1, $2)
        ON CONFLICT (restaurant_id, name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name
        `,
        [restaurantId, catName],
      );
      catMap.set(catName, catRes.rows[0].id);
    }

    for (const item of templateData.items) {
      const catId = catMap.get(item.categoryName);
      if (catId) {
        await client.query(
          `
          INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_veg, is_available)
          VALUES ($1, $2, $3, $4, $5, $6, true)
          `,
          [restaurantId, catId, item.name, item.description, item.price, item.isVeg],
        );
      }
    }

    // 6. Set Feature Flags & Trial End in superadmin_restaurant_features
    await client.query(
      `
      INSERT INTO superadmin_restaurant_features (
        restaurant_id, custom_plan, feature_overrides, trial_ends_at, notes, updated_by
      ) VALUES ($1, $2, '{}'::jsonb, NOW() + interval '${trialEndInterval}', $3, $4)
      ON CONFLICT (restaurant_id) DO UPDATE
      SET custom_plan = EXCLUDED.custom_plan,
          trial_ends_at = EXCLUDED.trial_ends_at,
          notes = EXCLUDED.notes,
          updated_by = EXCLUDED.updated_by
      `,
      [
        restaurantId,
        plan.toLowerCase(),
        `Onboarded via 1-Click Wizard with ${templateData.items.length} starter menu items and ${cleanTableCount} tables.`,
        actor,
      ],
    );

    await client.query("COMMIT");

    // 7. Audit Log
    await recordAuditLog({
      action: "RESTAURANT_WIZARD_ONBOARD",
      entityType: "restaurant",
      entityId: restaurantId,
      entityName: fullName,
      details: {
        plan,
        tableCount: cleanTableCount,
        sections: validSections,
        menuTemplate,
        ownerEmail: cleanEmail,
        trialDays,
      },
      actorUsername: actor,
    });

    const baseUrl = dinerBaseUrl();
    const tablesWithQr = tablesCreated.map((t) => {
      const qrToken = qrTokens.get(String(t.id)) || "";
      return { ...t, qrToken, qrUrl: qrToken ? tableQrUrl(baseUrl, qrToken) : "" };
    });

    return NextResponse.json({
      success: true,
      restaurantId,
      restaurantName: fullName,
      tableCount: cleanTableCount,
      tables: tablesWithQr,
      ownerEmail: cleanEmail,
      menuTemplate,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("1-Click Onboarding Wizard error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to onboard restaurant" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
