import { PrismaClient, Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
const prisma = new PrismaClient();

const products: Prisma.ProductCreateInput[] = [
  {
    id: uuid(),
    name: 'product1',
    stock: 10,
  },
  {
    id: uuid(),
    name: 'product2',
    stock: 10,
  },
];

const transfer = async () => {
  const promises = products.map((p) => {
    prisma.product.create({
      data: p,
    });
  });

  await Promise.all(promises);
};

const main = async () => {
  console.log(`Start seeding ...`);

  await transfer();

  console.log(`Seeding finished.`);
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
