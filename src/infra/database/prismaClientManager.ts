import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { TransactionContextStore } from './prismaTransactionScope';

export class PrismaClientManager {
  private prisma: PrismaClient;
  private transactionContext: AsyncLocalStorage<TransactionContextStore>;

  constructor(
    prisma: PrismaClient,
    transactionContext: AsyncLocalStorage<TransactionContextStore>
  ) {
    this.prisma = prisma;
    this.transactionContext = transactionContext;
  }

  getClient(): Prisma.TransactionClient {
    const prisma = this.transactionContext.getStore()?.prisma;

    if (prisma) {
      return prisma;
    } else {
      return this.prisma;
    }
  }
}
