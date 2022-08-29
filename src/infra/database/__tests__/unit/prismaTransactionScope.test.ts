import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import {
  PrismaTransactionScope,
  TransactionContextStore,
} from '../../prismaTransactionScope';

describe('PrismaTransactionScope', () => {
  let prisma: PrismaClient;
  let transactionContext: AsyncLocalStorage<TransactionContextStore>;

  beforeEach(() => {
    prisma = new PrismaClient();
    transactionContext = new AsyncLocalStorage<TransactionContextStore>();
  });

  it('should set a new client when transaction scope is run', async () => {
    // Arrange
    const transactionScope = new PrismaTransactionScope(
      prisma,
      transactionContext
    );
    const expectedCallback = jest.fn();

    // Act
    await transactionScope.run(async () => {
      const prismaClient = transactionContext.getStore()?.prisma;
      expect(prismaClient).toBeTruthy();

      expectedCallback();
    });

    // Assert
    const prismaClient = transactionContext.getStore()?.prisma;
    expect(prismaClient).toBeFalsy();
    expect(expectedCallback).toHaveBeenCalled();
  });

  it('should allow concurrent scopes', async () => {
    // Arrange
    const transactionScope = new PrismaTransactionScope(
      prisma,
      transactionContext
    );

    let client1: any;
    let client2: any;

    // Act
    await Promise.all([
      transactionScope.run(async () => {
        client1 = transactionContext.getStore()!.prisma;
      }),
      transactionScope.run(async () => {
        client2 = transactionContext.getStore()!.prisma;
      }),
    ]);

    // Assert
    expect(client1).toBeTruthy();
    expect(client2).toBeTruthy();
    expect(client1).not.toBe(client2);
  });
});
