import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config({ path: '/Users/ananthakrishnan/code/Admin/Qrave-admins/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query("ALTER TABLE superadmin_users ADD COLUMN IF NOT EXISTS name TEXT");
    await pool.query("ALTER TABLE superadmin_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin'");

    const password = "Anandu@1234";
    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO superadmin_users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE 
       SET name = EXCLUDED.name, role = EXCLUDED.role, password = EXCLUDED.password`,
      ["anandu", hashed, "Anantha Krishnan", "superadmin"]
    );

    console.log("Successfully updated schema and created superadmin user.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
