import pg from "pg";

const url = process.env.MIGRATE_DATABASE_URL;
if (!url) {
  console.error("ต้องตั้ง MIGRATE_DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

async function main() {
  await client.connect();
  const res = await client.query<{ table_name: string }>(
    `SELECT table_name FROM v_rls_coverage_gaps ORDER BY table_name`,
  );
  if (res.rows.length > 0) {
    console.error("ตารางที่มี tenant_id แต่ยังไม่มี RLS:");
    for (const row of res.rows) console.error(` - ${row.table_name}`);
    process.exit(1);
  }
  console.log("v_rls_coverage_gaps ว่าง — RLS ครบทุกตารางที่มี tenant_id");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
