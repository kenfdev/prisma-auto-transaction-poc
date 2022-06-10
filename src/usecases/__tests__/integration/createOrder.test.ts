import { PrismaClientManager } from '../../../infra/database/prismaClientManager';
import { PrismaOrderRepository } from '../../../infra/database/repos/prismaOrderRepository';
import { NotificationRepository } from '../../../repos/notificationRepository';
import { OrderRepository } from '../../../repos/orderRepository';
import { TransactionScope } from '../../../shared/transactionScope';
import * as cls from 'cls-hooked';
import { CreateOrder } from '../../createOrder/createOrder';
import { v4 as uuid } from 'uuid';
import { PrismaTransactionScope } from '../../../infra/database/prismaTransactionScope';
import { deleteAll } from '../../../testing/database';
import { MockNotificationRepository } from '../../../infra/mocks/repos/mockNotificationRepository';
import { PrismaClient } from '@prisma/client';

describe('CreateOrder', () => {
  let orderRepo: OrderRepository;
  let notificationRepo: jest.Mocked<NotificationRepository>;
  let transactionScope: TransactionScope;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const transactionContext = cls.createNamespace('transaction');
    prisma = new PrismaClient({
      log: ['query']
    });
    transactionScope = new PrismaTransactionScope(prisma, transactionContext);
    const clientManager = new PrismaClientManager(prisma, transactionContext);
    orderRepo = new PrismaOrderRepository(clientManager);
    notificationRepo = new MockNotificationRepository();

    await deleteAll(prisma);
  });

  it('should save order and send a notification', async () => {
    // Arrange
    const createOrder = new CreateOrder(
      orderRepo,
      notificationRepo,
      transactionScope
    );

    const expectedProduct = await prisma.product.create({
      data: {
        id: uuid(),
        name: 'Some Product',
        stock: 10,
      },
    });

    const expectedProductIds = [expectedProduct.id];

    // Act
    await createOrder.execute({ productIds: expectedProductIds });

    // Assert
    const orders = await prisma.order.findMany();
    expect(orders).toHaveLength(1);
    expect(notificationRepo.send).toHaveBeenCalled();
  });

  it('should save nothing if notification fails', async () => {
    // Arrange
    const createOrder = new CreateOrder(
      orderRepo,
      notificationRepo,
      transactionScope
    );

    const product = await prisma.product.create({
      data: {
        id: uuid(),
        name: 'Some Product',
        stock: 10,
      },
    });

    notificationRepo.send.mockRejectedValue(new Error('send failed'));

    // Act
    await expect(
      createOrder.execute({ productIds: [product.id] })
    ).rejects.toThrow();

    // Assert
    const orders = await prisma.order.findMany();
    expect(orders).toHaveLength(0);
    const orderProducts = await prisma.orderProduct.findMany();
    expect(orderProducts).toHaveLength(0);
  });

  it('should save concurrent executions', async () => {
    // Arrange
    const createOrder = new CreateOrder(
      orderRepo,
      notificationRepo,
      transactionScope
    );

    const expectedProduct = await prisma.product.create({
      data: {
        id: uuid(),
        name: 'Some Product',
        stock: 10,
      },
    });

    const expectedProductIds = [expectedProduct.id];

    // Act
    await Promise.all([
      createOrder.execute({ productIds: expectedProductIds }),
      createOrder.execute({ productIds: expectedProductIds }),
    ]);

    // Assert
    const orders = await prisma.order.findMany();
    expect(orders).toHaveLength(2);
    expect(notificationRepo.send).toHaveBeenCalledTimes(2);
  });
});
