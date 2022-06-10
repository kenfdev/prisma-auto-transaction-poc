import { PrismaClient } from '@prisma/client';

export async function deleteAll(prisma: PrismaClient): Promise<void> {
  await prisma.orderProduct.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
}
