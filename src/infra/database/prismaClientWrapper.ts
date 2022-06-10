import { Prisma, PrismaClient } from '@prisma/client';

export interface PrismaClientWrapper extends Prisma.TransactionClient {
  isInsideTransaction: boolean;
}

export class PrismaTransactionalClient<
    T extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions
  >
  extends PrismaClient<T>
  implements PrismaClientWrapper
{
  constructor(optionsArg?: Prisma.Subset<T, Prisma.PrismaClientOptions>) {
    super(optionsArg);
  }

  isInsideTransaction = false;

  async $$transaction<R>(
    fn: (prisma: Prisma.TransactionClient) => Promise<R>,
    options?: { maxWait?: number; timeout?: number }
  ): Promise<R> {
    if (this.isInsideTransaction) {
      // TODO: cannot pass options if already inside transaction
      return fn(this);
    } else {
      return this.$transaction<R>(fn, options);
    }
  }

  static createFromTransactionClient(
    client: Prisma.TransactionClient
  ): PrismaTransactionalClient {
    // TODO: pretty hacky way
    (client as any)['$$transaction'] = this.prototype.$$transaction;
    (client as any)['isInsideTransaction'] = true;
    return client as any;
  }
}
