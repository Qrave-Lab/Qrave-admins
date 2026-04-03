import { getOverview } from "./lib/superadmin/queries";

async function main() {
    try {
        const data = await getOverview("month");
        console.log("OK:", data);
    } catch (err) {
        console.error("ERROR:", err);
    }
}
main();
