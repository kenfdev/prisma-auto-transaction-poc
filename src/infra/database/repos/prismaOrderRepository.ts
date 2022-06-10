import { Order } from '../../../domain/order';
import { OrderRepository } from '../../../repos/orderRepository';
import { PrismaClientManager } from '../prismaClientManager';
import { v4 as uuid } from 'uuid';
import { TransactionScope } from '../../../shared/transactionScope';

export class PrismaOrderRepository implements OrderRepository {
  private readonly clientManager: PrismaClientManager;
  private readonly transactionScope: TransactionScope;

  constructor(
    clientManager: PrismaClientManager,
    transactionScope: TransactionScope
  ) {
    this.clientManager = clientManager;
    this.transactionScope = transactionScope;
  }

  async create(order: Order): Promise<void> {
    await this.transactionScope.run(async () => {
      const prisma = this.clientManager.getClient();
      const newOrder = await prisma.order.create({
        data: {
          id: order.id,
        },
      });

      for (const productId of order.productIds) {
        await prisma.orderProduct.create({
          data: {
            id: uuid(),
            orderId: newOrder.id,
            productId,
          },
        });
      }
    });
  }
}
