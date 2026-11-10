// Prints a bcrypt hash for SUPERADMIN_USERS_JSON.
// Usage: node scripts/hash-password.mjs   (you'll be asked for the password)
import bcrypt from "bcryptjs";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stderr });
rl.question("Password (min 12 characters): ", async (pw) => {
  rl.close();
  if (pw.trim().length < 12) {
    console.error("Too short.");
    process.exit(1);
  }
  console.log(await bcrypt.hash(pw.trim(), 12));
});
