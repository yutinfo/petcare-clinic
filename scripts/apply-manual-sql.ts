import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const dir = join(process.cwd(), "prisma", "sql");
const url = process.env.MIGRATE_DATABASE_URL;

if (!url) {
  console.error("ต้องตั้ง MIGRATE_DATABASE_URL");
  process.exit(1);
}

if (!existsSync(dir)) {
  console.log("ไม่มีโฟลเดอร์ prisma/sql — ไม่มี SQL เสริมให้รัน");
  process.exit(0);
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: url });

async function main() {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    console.log(`กำลังรัน ${file}`);
    await client.query(sql);
  }
  console.log("รัน SQL มือครบแล้ว");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
