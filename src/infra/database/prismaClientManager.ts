import { Prisma, PrismaClient } from '@prisma/client';
import * as cls from 'cls-hooked';
import { PRISMA_CLIENT_KEY } from './prismaTransactionScope';

export class PrismaClientManager {
  private prisma: PrismaClient;
  private transactionContext: cls.Namespace;

  constructor(prisma: PrismaClient, transactionContext: cls.Namespace) {
    this.prisma = prisma;
    this.transactionContext = transactionContext;
  }

  getClient(): Prisma.TransactionClient {
    const prisma = this.transactionContext.get(
      PRISMA_CLIENT_KEY
    ) as Prisma.TransactionClient;
    if (prisma) {
      return prisma;
    } else {
      return this.prisma;
    }
  }

  async transaction(fn: (prisma: Prisma.TransactionClient) => Promise<void>) {
    const prisma = this.transactionContext.get(
      PRISMA_CLIENT_KEY
    ) as Prisma.TransactionClient;

    if (prisma) {
      return await fn(prisma);
    } else {
      return await this.prisma.$transaction(async (innerPrisma) => {
        console.log('created transaction');
        await fn(innerPrisma);
      });
    }
  }
}
