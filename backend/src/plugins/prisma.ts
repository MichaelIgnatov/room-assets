import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '../generated/prisma/client.js';

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app: FastifyInstance) => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();
  app.decorate("prisma", prisma);

  app.addHook("onClose", async (inst: FastifyInstance) => {
    await inst.prisma.$disconnect();
  });
});
