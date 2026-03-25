import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type AuditClient = Prisma.TransactionClient;

export async function withAuditActor<T>(
  actorEmployeeId: string | undefined,
  fn: (tx: AuditClient) => Promise<T>,
  client: PrismaClient = prisma
) {
  return client.$transaction(async (tx) => {
    if (actorEmployeeId) {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${actorEmployeeId}, true)`;
    }

    return fn(tx);
  });
}
