import { Order } from '../../domain/order';
import { NotificationRepository } from '../../repos/notificationRepository';
import { OrderRepository } from '../../repos/orderRepository';
import { TransactionScope } from '../../shared/transactionScope';

type CreateOrderInput = {
  productIds: string[];
};

export class CreateOrder {
  private readonly orderRepo: OrderRepository;
  private readonly notificationRepo: NotificationRepository;
  private readonly transactionScope: TransactionScope;
  constructor(
    orderRepo: OrderRepository,
    notificationRepo: NotificationRepository,
    transactionScope: TransactionScope
  ) {
    this.orderRepo = orderRepo;
    this.notificationRepo = notificationRepo;
    this.transactionScope = transactionScope;
  }

  async execute({ productIds }: CreateOrderInput) {
    const order = Order.create(productIds);

    await this.transactionScope.run(async () => {
      await this.orderRepo.create(order);
      await this.notificationRepo.send(
        `Successfully created order: ${order.id}`
      );
    });
  }
}
