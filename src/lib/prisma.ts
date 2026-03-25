import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });

function createPrismaClient() {
  return new PrismaClient({ adapter });
}

function isStaleClient(client: PrismaClient | undefined) {
  if (!client) return true;

  // In dev, a cached client created before a schema/client regenerate can linger on
  // globalThis. If a delegate we now rely on is missing, rebuild the singleton.
  return typeof (client as PrismaClient & { project?: unknown }).project === 'undefined';
}

const prismaClient = isStaleClient(globalForPrisma.prisma)
  ? createPrismaClient()
  : globalForPrisma.prisma!;

export const prisma: PrismaClient = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
