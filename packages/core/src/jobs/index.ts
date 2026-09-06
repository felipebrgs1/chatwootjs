import type { Queue } from "bullmq";

export interface Job<T = unknown> {
  name: string;
  payload: T;
}

export type JobHandler<T = unknown> = (payload: T) => Promise<void> | void;

export interface JobRunner {
  dispatch<T>(job: Job<T>): Promise<void>;
}

/**
 * Runner in-process (dev sem docker). A interface é idêntica à do BullMQ,
 * que assume quando `REDIS_URL` estiver setado (Redis 8, já provisionado no
 * docker-compose) — sem mudar os chamadores (`initJobs` troca o `dispatch`
 * por baixo dos panos e liga um Worker nos mesmos handlers).
 */
export class InProcessRunner implements JobRunner {
  private handlers = new Map<string, JobHandler<never>>();

  on<T>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler<never>);
  }

  handlerFor(name: string): JobHandler<never> | undefined {
    return this.handlers.get(name);
  }

  async dispatch<T>(job: Job<T>): Promise<void> {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      throw new Error(`No handler registered for job "${job.name}"`);
    }
    await handler(job.payload as never);
  }
}

export const jobs = new InProcessRunner();

type RunnerName = "in-process" | "bullmq";

let runnerName: RunnerName = "in-process";
let bullQueue: Queue | null = null;

export function activeJobRunner(): RunnerName {
  return runnerName;
}

const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

/**
 * Se `REDIS_URL` estiver setado, publica os jobs numa fila BullMQ
 * (`chatwootjs`, prefixo `bull:`) e consome com um Worker no mesmo processo
 * (como o Rails faz com o Sidekiq no mesmo dyno). Sem `REDIS_URL`, segue
 * in-process. Idempotente — chame no boot do server.
 */
export async function initJobs(): Promise<RunnerName> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || bullQueue) return runnerName;
  try {
    const [{ Queue, Worker }, { default: IORedis }] = await Promise.all([
      import("bullmq"),
      import("ioredis"),
    ]);
    const makeConnection = () =>
      new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
    const queue = new Queue("chatwootjs", { connection: makeConnection() });
    await queue.waitUntilReady();
    new Worker(
      "chatwootjs",
      async (job) => {
        const handler = jobs.handlerFor(job.name);
        if (!handler) throw new Error(`No handler registered for job "${job.name}"`);
        await handler(job.data as never);
      },
      { connection: makeConnection(), concurrency: 5 },
    );
    const dispatch = jobs.dispatch.bind(jobs);
    jobs.dispatch = async <T>(job: Job<T>): Promise<void> => {
      try {
        await queue.add(job.name, job.payload, { ...DEFAULT_JOB_OPTS });
      } catch (err) {
        console.error(`[jobs] bullmq indisponível, executando "${job.name}" in-process`, err);
        await dispatch(job);
      }
    };
    bullQueue = queue;
    runnerName = "bullmq";
    console.log('[jobs] runner ativo: bullmq (fila "chatwootjs")');
  } catch (err) {
    console.error("[jobs] falha ao ligar bullmq, seguindo in-process", err);
  }
  return runnerName;
}
