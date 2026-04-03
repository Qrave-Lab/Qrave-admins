# Qrave Superadmin

Standalone Next.js app for Qrave platform admins to manage restaurants, menus, staff, support tickets, discounts, payments, analytics, and platform operations.

## Run

1. Install deps:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env.local
```

3. Start dev server:

```bash
npm run dev
```

## Admin Surface

- `Dashboard`: business overview across the platform.
- `Operations`: payments, dine-in orders, takeaway orders, downtime, tickets, discounts.
- `Restaurants`: create, inspect, activate, disable, revoke, and delete restaurants.
- `Menu Management`: view and edit live restaurant menus.
- `Staff Management`: view and manage restaurant staff assignments.
- `Discounts & Coupons`: global promotions and coupon redemption analytics.
- `Logs & Support`: customer feedback and staff-reported issues.
- `QAdmin Access`: create and review superadmin operator accounts.

## Auth Flow

- Login is owned by this Next app.
- Primary qadmin storage is the `superadmin_users` table.
- Optional bootstrap admins can be provided through `SUPERADMIN_USERS_JSON`.
- Sessions are stored in the `qrave_sa_session` cookie.
- Dashboard routes redirect to `/login` when no admin session is present.
