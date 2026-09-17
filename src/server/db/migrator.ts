import { PrismaClient } from "@prisma/client";

const globalForMigrator = globalThis as unknown as { migrator?: PrismaClient };

/**
 * Client ที่ใช้ role เจ้าของตาราง (app_migrator) — ข้าม RLS
 * ใช้เฉพาะงานที่ต้องเห็นทุก tenant เช่น worker, seed, โหลด membership ตอนล็อกอิน
 */
export function createMigratorClient(url = process.env.MIGRATE_DATABASE_URL): PrismaClient {
  if (!url) {
    throw new Error("ต้องตั้ง MIGRATE_DATABASE_URL");
  }
  return new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });
}

export function getMigrator(): PrismaClient {
  globalForMigrator.migrator ??= createMigratorClient();
  return globalForMigrator.migrator;
}
