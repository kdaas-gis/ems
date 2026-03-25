import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type TaskClient = Prisma.TransactionClient | PrismaClient;

export function getTaskStatusLabel(status?: string | null) {
  if (status === 'completed') return 'Completed';
  if (status === 'in-progress') return 'In Progress';
  return 'To Do';
}

export async function syncCompletedTaskToWorkLog(taskId: number, employeeId: string, client: TaskClient = prisma) {
  const task = await client.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!task) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingLog = await client.work_status.findFirst({
    where: {
      employee_id: employeeId,
      task_id: taskId,
      work_date: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  if (existingLog) {
    await client.work_status.update({
      where: { id: existingLog.id },
      data: {
        status: 'completed',
      },
    });
    return;
  }

  await client.work_status.create({
    data: {
      employee_id: employeeId,
      project_id: task.project_id ?? null,
      task_id: task.id,
      work_date: today,
      task: task.title,
      status: 'completed',
      description: task.description || 'Auto-created from completed task',
      created_at: new Date(),
    },
  });
}
