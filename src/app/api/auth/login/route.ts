import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { employee_id, password } = await request.json();

    if (!employee_id || !password) {
      return NextResponse.json(
        { error: 'Employee ID and password are required' },
        { status: 400 }
      );
    }

    const employee = await prisma.employees.findUnique({
      where: { employee_id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!employee.password) {
      return NextResponse.json(
        { error: 'Account not set up. Contact admin.' },
        { status: 401 }
      );
    }

    // Check if password is a temp password (plaintext match) or hashed
    let isValid = false;
    if (employee.password.startsWith('$2')) {
      isValid = await comparePassword(password, employee.password);
    } else {
      // Temp plaintext password
      isValid = password === employee.password;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signToken({
      id: employee.id,
      employee_id: employee.employee_id,
      name: employee.name,
      role: employee.role || 'employee',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: employee.id,
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        role: employee.role || 'employee',
        isTempPassword: !employee.password.startsWith('$2'),
      },
    });

    response.cookies.set('ems_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
