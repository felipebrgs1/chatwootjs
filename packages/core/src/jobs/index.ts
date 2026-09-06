export interface Job<T = unknown> {
  name: string;
  payload: T;
}

export type JobHandler<T = unknown> = (payload: T) => Promise<void> | void;

export interface JobRunner {
  dispatch<T>(job: Job<T>): Promise<void>;
}

/**
 * Runner in-process (dev/MVP). A interface é idêntica à do BullMQ,
 * que substitui esta classe a partir do M6 sem mudar os chamadores.
 */
export class InProcessRunner implements JobRunner {
  private handlers = new Map<string, JobHandler<never>>();

  on<T>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler<never>);
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
