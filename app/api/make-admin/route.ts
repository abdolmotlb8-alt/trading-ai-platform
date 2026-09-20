import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();
const SECRET = "admin123"; // رمز مخفی خودت، بعدا عوضش کن

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const action = searchParams.get('action');
  const email = searchParams.get('email');

  // چک امنیتی
  if (secret !== SECRET) {
    return NextResponse.json({ error: 'رمز اشتباهه! باید ?secret=admin123 بزنی' }, { status: 403 });
  }

  try {
    // 1. اول خودتو مدیر کل کن
    if (!action) {
      await prisma.user.updateMany({
        data: { role: 'ADMIN', isActive: true }
      });
      const users = await prisma.user.findMany({ take: 20 });
      return NextResponse.json({
        success: true,
        message: '✅ شما الان مدیر کل هستید!',
        totalUsers: users.length,
        users: users,
        دستورات: {
          "دیدن همه کاربرا": "/api/make-admin?secret=admin123&action=list",
          "مسدود کردن کاربر": "/api/make-admin?secret=admin123&action=ban&email=user@gmail.com",
          "آزاد کردن کاربر": "/api/make-admin?secret=admin123&action=unban&email=user@gmail.com",
          "حذف کاربر": "/api/make-admin?secret=admin123&action=delete&email=user@gmail.com",
          "مدیر کردن کسی": "/api/make-admin?secret=admin123&action=makeadmin&email=user@gmail.com",
          "دیدن اشتراک ها": "/api/make-admin?secret=admin123&action=subscriptions"
        }
      });
    }

    // 2. لیست کاربرا
    if (action === 'list') {
      const users = await prisma.user.findMany();
      return NextResponse.json({ users });
    }

    // 3. بن کردن
    if (action === 'ban' && email) {
      await prisma.user.update({ where: { email }, data: { isActive: false, isBanned: true } as any });
      return NextResponse.json({ success: true, message: `${email} مسدود شد` });
    }

    // 4. آنبن کردن
    if (action === 'unban' && email) {
      await prisma.user.update({ where: { email }, data: { isActive: true, isBanned: false } as any });
      return NextResponse.json({ success: true, message: `${email} آزاد شد` });
    }

    // 5. حذف کاربر
    if (action === 'delete' && email) {
      await prisma.user.delete({ where: { email } });
      return NextResponse.json({ success: true, message: `${email} حذف شد` });
    }

    // 6. مدیر کردن
    if (action === 'makeadmin' && email) {
      await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
      return NextResponse.json({ success: true, message: `${email} مدیر شد` });
    }

    // 7. اشتراک ها
    if (action === 'subscriptions') {
      const subs = await (prisma as any).subscription?.findMany() || await prisma.user.findMany({ where: { plan: { not: null } } as any });
      return NextResponse.json({ subscriptions: subs });
    }

    return NextResponse.json({ error: 'دستور نامشخص' });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
