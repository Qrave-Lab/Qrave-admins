import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";

export const runtime = "nodejs";

type OwnerMailRequest = {
  restaurant_id?: string;
  subject?: string;
  body?: string;
};

export async function POST(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  const actor = await requireSessionEmail();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const smtpHost = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = String(process.env.SMTP_USERNAME || "").trim();
  const smtpPass = String(process.env.SMTP_PASSWORD || "").trim();
  const smtpFrom = String(process.env.SMTP_FROM || smtpUser || "").trim();

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    return NextResponse.json(
      { error: "smtp not configured" },
      { status: 503 },
    );
  }

  let payload: OwnerMailRequest;
  try {
    payload = (await request.json()) as OwnerMailRequest;
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const restaurantID = String(payload.restaurant_id || "").trim();
  if (!restaurantID) {
    return NextResponse.json({ error: "restaurant_id required" }, { status: 400 });
  }

  const { rows } = await db.query(
    `
      SELECT
        r.name AS restaurant_name,
        COALESCE(u.name, split_part(u.email, '@', 1), 'Owner') AS owner_name,
        u.email AS owner_email,
        COALESCE(r.trial_ends_at, r.current_period_end) AS expiry_date
      FROM restaurants r
      LEFT JOIN LATERAL (
        SELECT u.name, u.email
        FROM restaurant_users ru
        JOIN users u ON u.id = ru.user_id
        WHERE ru.restaurant_id = r.id
          AND ru.role = 'owner'
        ORDER BY ru.created_at ASC
        LIMIT 1
      ) u ON TRUE
      WHERE r.id = $1
      LIMIT 1
    `,
    [restaurantID],
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "restaurant not found" }, { status: 404 });
  }

  const ownerEmail = String(row.owner_email || "").trim();
  if (!ownerEmail) {
    return NextResponse.json({ error: "owner email not found" }, { status: 404 });
  }

  const restaurantName = String(row.restaurant_name || "Restaurant").trim();
  const ownerName = String(row.owner_name || "Owner").trim();
  const expiryDate = row.expiry_date ? new Date(row.expiry_date) : null;

  const subject = String(payload.subject || `Message from Qrave for ${restaurantName}`).trim();
  const bodyTemplate = String(
    payload.body || `Hi {{owner_name}},\n\nThis is a message from Qrave for {{restaurant_name}}.\nPackage expiry: {{expiry_date}}\n\nRegards,\nQrave Billing`,
  );
  const body = bodyTemplate
    .replaceAll("{{owner_name}}", ownerName)
    .replaceAll("{{restaurant_name}}", restaurantName)
    .replaceAll(
      "{{expiry_date}}",
      expiryDate ? expiryDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
    );

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: ownerEmail,
    subject,
    text: body,
  });

  return NextResponse.json({
    ok: true,
    recipient: ownerEmail,
    restaurantName,
    actor,
  });
}