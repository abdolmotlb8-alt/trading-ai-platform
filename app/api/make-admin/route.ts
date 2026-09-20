import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const action = searchParams.get('action');
  const email = searchParams.get('email');

  if (secret !== 'admin123') {
    return NextResponse.json({ error: 'Invalid secret. Use ?secret=admin123' }, { status: 403 });
  }

  try {
    // Default: make everyone admin (you become super admin)
    if (!action) {
      const result = await prisma.user.updateMany({
        data: { role: 'ADMIN' }
      });
      const users = await prisma.user.findMany({ take: 50 });
      return NextResponse.json({
        success: true,
        message: `Success! ${result.count} users set to ADMIN`,
        users: users.map(u => ({ email: u.email, role: u.role, id: u.id })),
        commands: {
          list_users: "/api/make-admin?secret=admin123&action=list",
          delete_user: "/api/make-admin?secret=admin123&action=delete&email=USER_EMAIL",
          make_admin: "/api/make-admin?secret=admin123&action=makeadmin&email=USER_EMAIL",
          make_user: "/api/make-admin?secret=admin123&action=makeuser&email=USER_EMAIL"
        }
      });
    }

    if (action === 'list') {
      const users = await prisma.user.findMany();
      return NextResponse.json({ count: users.length, users });
    }

    if (action === 'delete' && email) {
      await prisma.user.delete({ where: { email } });
      return NextResponse.json({ success: true, message: `${email} deleted` });
    }

    if (action === 'makeadmin' && email) {
      await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
      return NextResponse.json({ success: true, message: `${email} is now ADMIN` });
    }

    if (action === 'makeuser' && email) {
      await prisma.user.update({ where: { email }, data: { role: 'USER' } });
      return NextResponse.json({ success: true, message: `${email} is now USER (banned from admin)` });
    }

    return NextResponse.json({ error: 'Invalid action' });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
