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

## Food Courts

`/food-courts` sets up and runs food courts: one QR for every stall's menu.

- List: status, billing, counts, setup gaps, and a "New food court" dialog.
- Each court: Overview (diner analytics, billing), Stalls (add existing restaurants, labels, cuisines, hide, remove), Operators (create or link accounts, one-time passwords, reset, remove), QR codes (bulk create, print), Ads (sponsored stall or featured dish, with reach), Settings (details, link, hours, images, archive).
- Talks to the Go API (`SUPERADMIN_BACKEND_URL` + `SUPERADMIN_API_KEY`) through `app/api/superadmin/food-courts/[[...path]]/route.ts`, which allows only listed calls, checks permissions and records every change in the audit log.
- Court QR codes point at `NEXT_PUBLIC_DINER_APP_URL` (default `https://order.qrave.in`) + `/fc/qr/<token>`; operators sign in at the same site's `/fc-admin/login`.

## Sign-in and roles

- Sessions are signed (HMAC-SHA256) and expire after 12 hours. **`SUPERADMIN_SESSION_SECRET` is required** (32+ random characters); without it nobody can sign in. Changing it signs everyone out.
- 5 failed sign-ins in 15 minutes block that IP + username for 15 minutes.
- Every write route and server action checks the admin's role (`lib/auth/roles.ts`). `GET /api/auth/me` returns the role and permissions for the UI.

| Permission | Super Admin | Ops Lead | Finance | Menu | Auditor |
|---|:-:|:-:|:-:|:-:|:-:|
| Manage QAdmins, create admin users | ✓ | | | | |
| Delete restaurants | ✓ | | | | |
| Restaurant status, onboarding, tables, staff | ✓ | ✓ | | | |
| Feature flags & plans | ✓ | | | | |
| Menus | ✓ | ✓ | | ✓ | |
| Discounts & coupons | ✓ | ✓ | | | |
| Support replies | ✓ | ✓ | | | |
| Broadcast banners | ✓ | ✓ | | | |
| Food courts | ✓ | ✓ | | | |
| Revenue / CSV export | ✓ | | ✓ | | |
| Audit log | ✓ | ✓ | ✓ | | ✓ |

Reads that aren't financial are open to every signed-in role.
