import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClientManager } from '../../prismaClientManager';
import { TransactionContextStore } from '../../prismaTransactionScope';

describe('PrismaClientManager', () => {
  let transactionContext: AsyncLocalStorage<TransactionContextStore>;
  let prisma: PrismaClient;

  beforeEach(() => {
    transactionContext = new AsyncLocalStorage<TransactionContextStore>();
    prisma = new PrismaClient();
  });

  it('should return the original client when nothing is set to cls', () => {
    // Arrange
    const clientManager = new PrismaClientManager(prisma, transactionContext);

    // Act
    const actual = clientManager.getClient();

    // Assert
    expect(actual).toBe(prisma);
  });

  it('should return the cls context client when it is set', () => {
    // Arrange
    const clientManager = new PrismaClientManager(prisma, transactionContext);

    const newClient = new PrismaClient();
    transactionContext.run({}, () => {
      const store = transactionContext.getStore();
      if (store) {
        store.prisma = newClient;
      }

      // Act
      const actual = clientManager.getClient();

      // Assert
      expect(actual).not.toBe(prisma);
      expect(actual).toBe(newClient);
    });
  });
});
