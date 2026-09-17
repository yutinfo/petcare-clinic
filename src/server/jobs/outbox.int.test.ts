import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createAppContext, SYSTEM_ACTOR } from "@/server/context";
import { drainOutbox } from "@/server/jobs/outbox";
import { getPgHarness, type PgHarness } from "@/test/pg-harness";

let h: PgHarness;

beforeAll(async () => {
  h = await getPgHarness();
});

describe("OutboxEvent", () => {
  it("เขียน event ในทรานแซกชันเดียวกับข้อมูล แล้ว worker ทำเครื่องหมาย processed", async () => {
    const tenantId = randomUUID();
    await h.migrator.tenant.create({
      data: {
        id: tenantId,
        slug: `outbox-${tenantId.slice(0, 8)}`,
        legalName: "เอ",
        displayName: "เอ",
      },
    });

    const ctx = createAppContext({
      db: h.migrator,
      tenantId,
      actor: SYSTEM_ACTOR,
    });

    await ctx.tx(async (tx) => {
      await tx.owner.create({
        data: { tenantId, code: "O-OBX01", firstName: "นุ่น", searchKey: "" },
      });
      ctx.emit("owner.created", { tenantId });
    });

    const pending = await h.migrator.outboxEvent.findMany({ where: { tenantId } });
    expect(pending).toHaveLength(1);
    expect(pending[0]?.processedAt).toBeNull();

    const n = await drainOutbox(h.migrator);
    expect(n).toBeGreaterThanOrEqual(1);

    const done = await h.migrator.outboxEvent.findMany({ where: { tenantId } });
    expect(done[0]?.processedAt).not.toBeNull();
  });
});
