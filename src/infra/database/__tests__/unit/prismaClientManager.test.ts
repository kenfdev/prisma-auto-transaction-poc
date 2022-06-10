import * as cls from 'cls-hooked';
import { PrismaClientManager } from '../../prismaClientManager';
import {
  PrismaClientWrapper,
  PrismaTransactionalClient,
} from '../../prismaClientWrapper';
import { PRISMA_CLIENT_KEY } from '../../prismaTransactionScope';

describe('PrismaClientManager', () => {
  let transactionContext: cls.Namespace;
  let prisma: PrismaClientWrapper;

  beforeEach(() => {
    transactionContext = cls.createNamespace('transaction');
    prisma = new PrismaTransactionalClient();
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

    const newClient = new PrismaTransactionalClient();
    transactionContext.run(() => {
      transactionContext.set(PRISMA_CLIENT_KEY, newClient);

      // Act
      const actual = clientManager.getClient();

      // Assert
      expect(actual).not.toBe(prisma);
      expect(actual).toBe(newClient);
    });
  });
});
