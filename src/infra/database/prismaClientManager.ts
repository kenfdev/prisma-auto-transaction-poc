import { PrismaClientWrapper } from './prismaClientWrapper';
import * as cls from 'cls-hooked';
import { PRISMA_CLIENT_KEY } from './prismaTransactionScope';

export class PrismaClientManager {
  private prisma: PrismaClientWrapper;
  private transactionContext: cls.Namespace;

  constructor(prisma: PrismaClientWrapper, transactionContext: cls.Namespace) {
    this.prisma = prisma;
    this.transactionContext = transactionContext;
  }

  getClient(): PrismaClientWrapper {
    const prisma = this.transactionContext.get(
      PRISMA_CLIENT_KEY
    ) as PrismaClientWrapper;
    if (prisma) {
      return prisma;
    } else {
      return this.prisma;
    }
  }
}
