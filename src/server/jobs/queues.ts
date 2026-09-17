import { Queue } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | undefined;

export function getRedis(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export const QUEUE_OUTBOX = "outbox-drain";

export function outboxQueue(): Queue {
  return new Queue(QUEUE_OUTBOX, { connection: getRedis() });
}
