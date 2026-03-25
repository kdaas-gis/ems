import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const admins = [
      { employee_id: 'qc_15', name: 'Admin 1', email: 'qc15@gisteam.local' },
      { employee_id: 'qc_06', name: 'Admin 2', email: 'qc06@gisteam.local' },
    ];

    for (const admin of admins) {
      const existing = await prisma.employees.findUnique({
        where: { employee_id: admin.employee_id },
      });

      if (!existing) {
        await prisma.employees.create({
          data: {
            ...admin,
            password: 'admin',
            role: 'admin',
          },
        });
      } else {
        // Ensure they have admin role even if they exist
        await prisma.employees.update({
          where: { employee_id: admin.employee_id },
          data: { role: 'admin' },
        });
      }
    }

    return NextResponse.json({ message: 'Admin users (qc_15, qc_06) seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed admin users' }, { status: 500 });
  }
}
