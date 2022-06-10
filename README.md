# Prisma cross module transaction PoC

This is a PoC to see if cross module transaction is possible with Prisma.

Despite Prisma being able to use interactive transaction, it forces you to use a newly created `Prisma.TransactionClient` as follows:

```ts
// copied from official docs https://www.prisma.io/docs/concepts/components/prisma-client/transactions#batchbulk-operations

await prisma.$transaction(async (prisma) => {
  // 1. Decrement amount from the sender.
  const sender = await prisma.account.update({
    data: {
      balance: {
        decrement: amount,
      },
    },
    where: {
      email: from,
    },
  });
  // 2. Verify that the sender's balance didn't go below zero.
  if (sender.balance < 0) {
    throw new Error(`${from} doesn't have enough to send ${amount}`);
  }
  // 3. Increment the recipient's balance by amount
  const recipient = prisma.account.update({
    data: {
      balance: {
        increment: amount,
      },
    },
    where: {
      email: to,
    },
  });
  return recipient;
});
```

This becomes troublesome when you're working with a enterprise-ish project where multiple repositories need to work in a single transaction.

This PoC got inspiration from [this](https://github.com/prisma/prisma/issues/5729#issuecomment-959137819) issue comment and uses the power of [cls-hooked](https://www.npmjs.com/package/cls-hooked) to be able to pass the `Prisma.TransactionClient` between modules.

Hence, you'll be able to write code like this.

```ts
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

    // create a transaction scope inside the Application layer
    await this.transactionScope.run(async () => {
      // call multiple repository methods inside the transaction
      // if either fails, the transaction will rollback
      await this.orderRepo.create(order);
      await this.notificationRepo.send(
        `Successfully created order: ${order.id}`
      );
    });
  }
}
```

Furthermore, you can call a transaction from within the repository, too. Since somebody might forget to use the transaction scope in the application layer.

```ts
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
    // you don't need to care if you're inside a transaction or not
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
```

The truth is, it's just a little hack in the `PrismaTransactionScope`. It'll only create a transaction if you are already inside.


```ts
export class PrismaTransactionScope implements TransactionScope {
  private readonly prisma: PrismaClient;
  private readonly transactionContext: cls.Namespace;

  constructor(prisma: PrismaClient, transactionContext: cls.Namespace) {
    this.prisma = prisma;
    this.transactionContext = transactionContext;
  }

  async run(fn: () => Promise<void>): Promise<void> {
    // check if the transaction client is present or not
    const prisma = this.transactionContext.get(
      PRISMA_CLIENT_KEY
    ) as Prisma.TransactionClient;

    if (prisma) {
      // if the transaction client is present, just execute the callback
      await fn();
    } else {
      // if the transaction client is not present, create the transaction and save the Prisma.TransactionClient inside the cls to be used later on.
      await this.prisma.$transaction(async (prisma) => {
        await this.transactionContext.runPromise(async () => {
          this.transactionContext.set(PRISMA_CLIENT_KEY, prisma);

          try {
            await fn();
          } catch (err) {
            this.transactionContext.set(PRISMA_CLIENT_KEY, null);
            throw err;
          }
        });
      });
    }
  }
}
```