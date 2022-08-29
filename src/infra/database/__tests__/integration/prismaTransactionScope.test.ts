import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClientManager } from '../../prismaClientManager';
import {
  PrismaTransactionScope,
  TransactionContextStore,
} from '../../prismaTransactionScope';
import { v4 as uuid } from 'uuid';
import { deleteAll } from '../../../../testing/database';
import { PrismaClient } from '@prisma/client';

describe('PrismaTransactionScope', () => {
  let prisma: PrismaClient;
  let transactionContext: AsyncLocalStorage<TransactionContextStore>;

  beforeEach(async () => {
    prisma = new PrismaClient();
    transactionContext = new AsyncLocalStorage();
    await deleteAll(prisma);
  });

  it('should commit multiple actions', async () => {
    // Arrange
    const transactionScope = new PrismaTransactionScope(
      prisma,
      transactionContext
    );

    const clientManager = new PrismaClientManager(prisma, transactionContext);

    // Act
    await transactionScope.run(async () => {
      const prismaClient = clientManager.getClient();
      await prismaClient.product.create({
        data: {
          id: uuid(),
          name: 'Some Product',
          stock: 10,
        },
      });

      await prismaClient.order.create({
        data: {
          id: uuid(),
        },
      });
    });

    // Assert
    const actualProducts = await prisma.product.findMany();
    const actualOrders = await prisma.order.findMany();

    expect(actualProducts).toHaveLength(1);
    expect(actualOrders).toHaveLength(1);
  });

  it('should rollback if Error is thrown', async () => {
    // Arrange
    const transactionScope = new PrismaTransactionScope(
      prisma,
      transactionContext
    );

    const clientManager = new PrismaClientManager(prisma, transactionContext);

    // Act
    await expect(
      transactionScope.run(async () => {
        const prismaClient = clientManager.getClient();
        await prismaClient.product.create({
          data: {
            id: uuid(),
            name: 'Some Product',
            stock: 10,
          },
        });

        throw new Error('something went wrong');
      })
    ).rejects.toThrow();

    // Assert
    const actualProducts = await prisma.product.findMany();

    expect(actualProducts).toHaveLength(0);
  });

  it('should work with concurrent transactions', async () => {
    // Arrange
    const transactionScope = new PrismaTransactionScope(
      prisma,
      transactionContext
    );

    const clientManager = new PrismaClientManager(prisma, transactionContext);

    // Act
    await Promise.all([
      transactionScope.run(async () => {
        const prismaClient = clientManager.getClient();
        await prismaClient.product.create({
          data: {
            id: uuid(),
            name: 'Some Product1',
            stock: 10,
          },
        });
      }),
      transactionScope.run(async () => {
        const prismaClient = clientManager.getClient();
        await prismaClient.product.create({
          data: {
            id: uuid(),
            name: 'Some Product2',
            stock: 10,
          },
        });
      }),
    ]);

    // Assert
    const actualProducts = await prisma.product.findMany();

    expect(actualProducts).toHaveLength(2);
  });

  it('should allow calling the transaction method inside a transaction', async () => {
    // Arrange
    const transactionScope = new PrismaTransactionScope(
      prisma,
      transactionContext
    );

    const clientManager = new PrismaClientManager(prisma, transactionContext);

    // Act
    await transactionScope.run(async () => {
      await transactionScope.run(async () => {
        const innerPrisma = clientManager.getClient();
        await innerPrisma.product.create({
          data: {
            id: uuid(),
            name: 'Some Product1',
            stock: 10,
          },
        });
      });
    });

    // Assert
    const actualProducts = await prisma.product.findMany();

    expect(actualProducts).toHaveLength(1);
  });
});
