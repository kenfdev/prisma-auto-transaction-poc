import { Prisma, PrismaClient } from '@prisma/client';
import { TransactionScope } from '../../shared/transactionScope';

import { AsyncLocalStorage } from 'async_hooks';

export const PRISMA_CLIENT_KEY = 'prisma';

export interface TransactionContextStore {
  prisma?: Prisma.TransactionClient | null;
}

export class PrismaTransactionScope implements TransactionScope {
  private readonly prisma: PrismaClient;
  private readonly transactionContext: AsyncLocalStorage<TransactionContextStore>;

  constructor(
    prisma: PrismaClient,
    transactionContext: AsyncLocalStorage<TransactionContextStore>
  ) {
    this.prisma = prisma;
    this.transactionContext = transactionContext;
  }

  async run(fn: () => Promise<void>): Promise<void> {
    const store = this.transactionContext.getStore();

    if (store?.prisma) {
      await fn();
    } else {
      await this.prisma.$transaction(async (prisma) => {
        await this.transactionContext.run({}, async () => {
          const store = this.transactionContext.getStore()!;
          store.prisma = prisma;

          try {
            await fn();
          } catch (err) {
            const store = this.transactionContext.getStore()!;
            if (store) {
              store.prisma = null;
            }
            throw err;
          }
        });
      });
    }
  }
}
