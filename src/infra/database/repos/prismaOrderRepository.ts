import { Order } from '../../../domain/order';
import { OrderRepository } from '../../../repos/orderRepository';
import { PrismaClientManager } from '../prismaClientManager';
import { v4 as uuid } from 'uuid';

export class PrismaOrderRepository implements OrderRepository {
  private readonly clientManager: PrismaClientManager;

  constructor(clientManager: PrismaClientManager) {
    this.clientManager = clientManager;
  }

  async create(order: Order): Promise<void> {
    await this.clientManager.transaction(async (prisma) => {
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
