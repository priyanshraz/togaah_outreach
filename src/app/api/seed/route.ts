export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Check if any user already exists — prevent re-seeding
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@togahh.com' },
    });

    const hashedPassword = await bcrypt.hash('Togaa@123', 10);

    if (existingUser) {
      // Update password if user already exists
      await prisma.user.update({
        where: { email: 'admin@togahh.com' },
        data: { password: hashedPassword },
      });
      return NextResponse.json({
        success: true,
        message: 'Password updated successfully!',
        email: 'admin@togahh.com',
      });
    }

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: 'admin@togahh.com',
        name: 'Toga Admin',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully!',
      email: user.email,
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}
