import { execSync } from "node:child_process";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

export type PgHarness = {
  container: StartedPostgreSqlContainer;
  migratorUrl: string;
  appUrl: string;
  migrator: PrismaClient;
  app: PrismaClient;
  stop: () => Promise<void>;
};

let singleton: Promise<PgHarness> | undefined;

export function getPgHarness(): Promise<PgHarness> {
  singleton ??= startPgHarness();
  return singleton;
}

async function startPgHarness(): Promise<PgHarness> {
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("petcare")
    .withUsername("app_migrator")
    .withPassword("app_migrator_dev")
    .start();

  const migratorUrl = container.getConnectionUri();
  const admin = new pg.Client({ connectionString: migratorUrl });
  await admin.connect();
  await admin.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev';
      END IF;
    END $$;
    GRANT CONNECT ON DATABASE petcare TO app_user;
    GRANT USAGE ON SCHEMA public TO app_user;
  `);
  await admin.end();

  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: migratorUrl,
      MIGRATE_DATABASE_URL: migratorUrl,
    },
  });

  const appUrl = migratorUrl.replace("app_migrator:app_migrator_dev", "app_user:app_user_dev");

  const migrator = new PrismaClient({ datasources: { db: { url: migratorUrl } } });
  const app = new PrismaClient({ datasources: { db: { url: appUrl } } });

  return {
    container,
    migratorUrl,
    appUrl,
    migrator,
    app,
    async stop() {
      await app.$disconnect();
      await migrator.$disconnect();
      await container.stop();
    },
  };
}
