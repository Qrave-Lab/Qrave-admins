import { db } from "./lib/db";

async function run() {
    try {
        console.log("Checking menu_items columns:");
        const menuRes = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'menu_items';
        `);
        console.table(menuRes.rows);

        console.log("\nChecking staff_feedback columns:");
        const staffRes = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'staff_feedback';
        `);
        console.table(staffRes.rows);

         console.log("\nChecking staff_feedback data:");
         const staffData = await db.query(`SELECT * FROM staff_feedback LIMIT 5;`);
         console.table(staffData.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

run();
