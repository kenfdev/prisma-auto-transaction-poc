import { Order } from '../../../domain/order';
import { OrderRepository } from '../../../repos/orderRepository';
import { PrismaClientManager } from '../prismaClientManager';
import { v4 as uuid } from 'uuid';
import {
  PrismaClientWrapper,
  PrismaTransactionalClient,
} from '../prismaClientWrapper';

export class PrismaOrderRepository implements OrderRepository {
  private readonly clientManager: PrismaClientManager;

  constructor(clientManager: PrismaClientManager) {
    this.clientManager = clientManager;
  }

  async create(order: Order): Promise<void> {
    // const client = this.clientManager.getClient();

    await this.transaction(async (prisma) => {
      console.log('order create start');
      const newOrder = await prisma.order.create({
        data: {
          id: order.id,
        },
      });
      console.log('order create end');

      console.log('orderProduct create start');
      for (const productId of order.productIds) {
        await prisma.orderProduct.create({
          data: {
            id: uuid(),
            orderId: newOrder.id,
            productId,
          },
        });
      }
      console.log('orderProduct create end');
    });
  }

  async transaction(fn: (prisma: PrismaClientWrapper) => Promise<void>) {
    const client = this.clientManager.getClient();
    if ((client as any).isInsideTransaction) {
      return await fn(client);
    }
    Promise.reject();
  }
}
