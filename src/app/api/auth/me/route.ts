import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
      const employee = await prisma.employees.findUnique({
        where: { employee_id: session.employee_id },
        select: {
          id: true,
          employee_id: true,
          employee_code: true,
          name: true,
          email: true,
          role: true,
          dob: true,
          blood_type: true,
          designation: true,
          contact_num: true,
        },
      });

      if (employee) {
        return NextResponse.json({ user: employee });
      }
    } catch (error) {
      console.error('Auth me profile lookup error:', error);
    }

    return NextResponse.json({ user: session });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
