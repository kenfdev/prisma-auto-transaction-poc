import { PrismaClient } from '@prisma/client';
import * as cls from 'cls-hooked';
import {
  PrismaTransactionScope,
  PRISMA_CLIENT_KEY,
} from '../../prismaTransactionScope';

describe('PrismaTransactionScope', () => {
  let prisma: PrismaClient;
  let transactionContext: cls.Namespace;

  beforeEach(() => {
    prisma = new PrismaClient();
    transactionContext = cls.createNamespace('transaction');
  });

  it('should set a new client when transaction scope is run', async () => {
    // Arrange
    const transactionScope = new PrismaTransactionScope(
      prisma,
      transactionContext
    );
    const spy = jest.spyOn(transactionContext, 'set');

    const expectedCallback = jest.fn();

    // Act
    await transactionScope.run(async () => {
      const prismaClient = transactionContext.get(PRISMA_CLIENT_KEY);
      expect(prismaClient).toBeTruthy();

      expectedCallback();
    });

    // Assert
    const prismaClient = transactionContext.get(PRISMA_CLIENT_KEY);
    expect(prismaClient).toBeFalsy();
    expect(spy).toHaveBeenCalled();
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
        client1 = transactionContext.get(PRISMA_CLIENT_KEY);
      }),
      transactionScope.run(async () => {
        client2 = transactionContext.get(PRISMA_CLIENT_KEY);
      }),
    ]);

    // Assert
    expect(client1).toBeTruthy();
    expect(client2).toBeTruthy();
    expect(client1).not.toBe(client2);
  });
});
