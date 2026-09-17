import { Worker } from "bullmq";
import { createMigratorClient } from "@/server/db/migrator";
import { drainOutbox } from "@/server/jobs/outbox";
import { getRedis, outboxQueue, QUEUE_OUTBOX } from "@/server/jobs/queues";

async function main() {
  const db = createMigratorClient();
  const queue = outboxQueue();
  await queue.add(
    "drain",
    {},
    { repeat: { every: 5_000 }, jobId: "outbox-drain-repeat" },
  );

  const worker = new Worker(
    QUEUE_OUTBOX,
    async () => {
      const n = await drainOutbox(db);
      return { processed: n };
    },
    { connection: getRedis() },
  );

  worker.on("failed", (job, err) => {
    console.error(`job ${job?.id} ล้มเหลว:`, err.message);
  });

  console.log("worker พร้อมแล้ว — กำลังดึง OutboxEvent ทุก 5 วินาที");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
