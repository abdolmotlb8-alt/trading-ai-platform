import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TYPES / LABELS
========================================================= */

const PLAN_LABELS: Record<string, string> = {
  FREE: "رایگان",
  BASIC: "پایه",
  PRO: "حرفه‌ای",
  PREMIUM: "Premium",
  VIP: "VIP",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "فعال",
  OPEN: "باز",
  PENDING: "در انتظار",
  CLOSED: "بسته",
  CANCELLED: "لغو شده",
  EXPIRED: "منقضی",
};

function planLabel(plan: string) {
  return PLAN_LABELS[plan] ?? plan;
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function dateText(date: Date | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function dateOnly(date: Date | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
  }).format(date);
}

function initials(name: string) {
  const value = name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return value || "U";
}

function daysRemaining(date: Date | null | undefined) {
  if (!date) return null;

  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

/* =========================================================
   ADMIN AUTH
========================================================= */

async function requireAdmin() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const admin = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/");
  }

  return admin;
}

/* =========================================================
   BLOCK / UNBLOCK USER
========================================================= */

async function toggleUserBlock(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId) return;

  /* مدیر نمی‌تواند خودش را مسدود کند */

  if (userId === admin.id) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isBlocked: true,
    },
  });

  if (!user) return;

  const shouldBlock = mode === "BLOCK";

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: shouldBlock
        ? {
            isBlocked: true,
            blockedAt: new Date(),
            blockedReason:
              reason ||
              "حساب توسط مدیریت Trading AI مسدود شد.",
          }
        : {
            isBlocked: false,
            blockedAt: null,
            blockedReason: null,
          },
    }),

    prisma.userNotification.create({
      data: {
        userId,
        type: shouldBlock ? "ACCOUNT_BLOCKED" : "ACCOUNT_UNBLOCKED",
        title: shouldBlock
          ? "حساب شما مسدود شد"
          : "حساب شما فعال شد",
        message: shouldBlock
          ? "دسترسی حساب شما توسط مدیریت محدود شده است."
          : "محدودیت حساب شما توسط مدیریت برداشته شد.",
        dedupeKey: `account-status-${userId}-${shouldBlock ? "blocked" : "unblocked"}-${randomUUID()}`,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

/* =========================================================
   CHANGE PLAN
========================================================= */

async function changeUserPlan(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();

  const allowedPlans = [
    "FREE",
    "BASIC",
    "PRO",
    "PREMIUM",
    "VIP",
  ];

  if (!userId || !allowedPlans.includes(plan)) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!user) return;

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        plan,
      },
    }),

    prisma.userNotification.create({
      data: {
        userId,
        type: "PLAN_CHANGED",
        title: "پلن حساب تغییر کرد",
        message: `پلن حساب شما به ${planLabel(plan)} تغییر کرد.`,
        dedupeKey: `plan-change-${userId}-${randomUUID()}`,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

/* =========================================================
   CREATE / EXTEND SUBSCRIPTION
========================================================= */

async function saveSubscription(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();
  const daysRaw = String(formData.get("days") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const currency = String(formData.get("currency") ?? "IRR").trim();
  const note = String(formData.get("note") ?? "").trim();

  const days = Number(daysRaw);
  const price =
    priceRaw.length > 0 ? Number(priceRaw) : null;

  const allowedPlans = [
    "BASIC",
    "PRO",
    "PREMIUM",
    "VIP",
  ];

  if (
    !userId ||
    !allowedPlans.includes(plan) ||
    !Number.isFinite(days) ||
    days <= 0 ||
    days > 3650
  ) {
    return;
  }

  if (
    price !== null &&
    (!Number.isFinite(price) || price < 0)
  ) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!user) return;

  const now = new Date();

  /*
    اگر اشتراک قبلی هنوز فعال باشد،
    تمدید از تاریخ انقضای فعلی ادامه پیدا می‌کند.
  */

  const startsAt =
    user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt > now
      ? user.subscriptionExpiresAt
      : now;

  const expiresAt = new Date(startsAt);

  expiresAt.setDate(expiresAt.getDate() + days);

  await prisma.$transaction([
    prisma.userSubscription.create({
      data: {
        userId,
        plan,
        status: "ACTIVE",
        startsAt,
        expiresAt,
        price,
        currency: currency || null,
        autoRenew: false,
        note: note || null,
      },
    }),

    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        plan,
        subscriptionStartedAt: now,
        subscriptionExpiresAt: expiresAt,
      },
    }),

    prisma.userNotification.create({
      data: {
        userId,
        type: "SUBSCRIPTION_UPDATED",
        title: "اشتراک شما فعال شد",
        message: `پلن ${planLabel(
          plan,
        )} برای شما فعال شد و تا ${dateOnly(
          expiresAt,
        )} اعتبار دارد.`,
        dedupeKey: `subscription-${userId}-${randomUUID()}`,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

/* =========================================================
   CANCEL SUBSCRIPTION
========================================================= */

async function cancelSubscription(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) return;

  const activeSubscription =
    await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      orderBy: {
        expiresAt: "desc",
      },
    });

  if (!activeSubscription) {
    return;
  }

  await prisma.$transaction([
    prisma.userSubscription.update({
      where: {
        id: activeSubscription.id,
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        autoRenew: false,
      },
    }),

    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        plan: "FREE",
        subscriptionExpiresAt: null,
      },
    }),

    prisma.userNotification.create({
      data: {
        userId,
        type: "SUBSCRIPTION_CANCELLED",
        title: "اشتراک لغو شد",
        message:
          "اشتراک شما توسط مدیریت لغو شد.",
        dedupeKey: `subscription-cancel-${userId}-${randomUUID()}`,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

/* =========================================================
   CLOSE SUPPORT TICKET
========================================================= */

async function closeTicket(formData: FormData) {
  "use server";

  await requireAdmin();

  const ticketId = String(
    formData.get("ticketId") ?? "",
  ).trim();

  const userId = String(
    formData.get("userId") ?? "",
  ).trim();

  if (!ticketId || !userId) return;

  await prisma.supportTicket.update({
    where: {
      id: ticketId,
    },
    data: {
      status: "CLOSED",
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/support");
}

/* =========================================================
   PAGE
========================================================= */

type PageProps = {
  searchParams?: {
    q?: string;
    plan?: string;
    status?: string;
    user?: string;
  };
};

export default async function AdminUsersPage({
  searchParams,
}: PageProps) {
  const admin = await requireAdmin();

  const q = String(searchParams?.q ?? "").trim();
  const planFilter = String(
    searchParams?.plan ?? "",
  ).trim();

  const statusFilter = String(
    searchParams?.status ?? "",
  ).trim();

  const requestedUserId = String(
    searchParams?.user ?? "",
  ).trim();

  const where: any = {};

  if (q) {
    where.OR = [
      {
        name: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: q,
          mode: "insensitive",
        },
      },
    ];
  }

  if (planFilter) {
    where.plan = planFilter;
  }

  if (statusFilter === "BLOCKED") {
    where.isBlocked = true;
  }

  if (statusFilter === "ACTIVE") {
    where.isBlocked = false;
  }

  const [
    totalUsers,
    blockedUsers,
    activeSubscriptions,
    openTickets,
    users,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        isBlocked: true,
      },
    }),

    prisma.userSubscription.count({
      where: {
        status: "ACTIVE",
        expiresAt: {
          gt: new Date(),
        },
      },
    }),

    prisma.supportTicket.count({
      where: {
        status: {
          in: ["OPEN", "PENDING"],
        },
      },
    }),

    prisma.user.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,

        avatarUrl: true,
        avatarEmoji: true,

        isBlocked: true,
        blockedAt: true,
        blockedReason: true,

        subscriptionStartedAt: true,
        subscriptionExpiresAt: true,

        guestUsed: true,
        guestStartedAt: true,
        guestExpiresAt: true,
        guestEndedAt: true,

        createdAt: true,
        updatedAt: true,

        subscriptions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
        },

        supportTickets: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 10,
          include: {
            messages: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    }),
  ]);

  const selected =
    users.find(
      (user) => user.id === requestedUserId,
    ) ?? users[0] ?? null;

  const selectedDays =
    selected?.subscriptionExpiresAt
      ? daysRemaining(
          selected.subscriptionExpiresAt,
        )
      : null;

  const selectedSubscriptionActive =
    !!selected?.subscriptionExpiresAt &&
    selected.subscriptionExpiresAt.getTime() >
      Date.now() &&
    selected.plan !== "FREE";

  const totalSupportTickets =
    selected?.supportTickets.length ?? 0;

  const selectedOpenTickets =
    selected?.supportTickets.filter(
      (ticket) =>
        ticket.status === "OPEN" ||
        ticket.status === "PENDING",
    ).length ?? 0;

  const selectedMessages =
    selected?.supportTickets.reduce(
      (total, ticket) =>
        total + ticket.messages.length,
      0,
    ) ?? 0;

  return (
    <main dir="rtl" className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        :root {
          color-scheme: dark;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #050608;
          color: #f3f4f6;
          font-family: Tahoma, Arial, sans-serif;
        }

        body {
          min-height: 100vh;
        }

        button,
        input,
        select,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .page {
          min-height: 100vh;
          padding: 18px;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(205, 161, 65, .13),
              transparent 26%
            ),
            radial-gradient(
              circle at 0% 70%,
              rgba(20, 75, 90, .13),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #07090d 0%,
              #0a0d12 48%,
              #050608 100%
            );
        }

        .shell {
          width: min(1450px, 100%);
          margin: auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 235px;
          gap: 18px;
          align-items: start;
        }

        .main {
          min-width: 0;
        }

        .sidebar {
          position: sticky;
          top: 18px;
          padding: 16px;
          border-radius: 25px;
          border: 1px solid rgba(255,255,255,.07);
          background:
            linear-gradient(
              145deg,
              rgba(18,21,26,.93),
              rgba(8,10,14,.91)
            );
          box-shadow:
            0 25px 70px rgba(0,0,0,.35);
          backdrop-filter: blur(22px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 6px 4px 19px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .brand-logo {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          border: 1px solid rgba(222,177,75,.25);
          background:
            linear-gradient(
              145deg,
              rgba(224,180,76,.18),
              rgba(224,180,76,.035)
            );
          color: #e4b953;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .brand strong {
          display: block;
          font-size: 14px;
        }

        .brand small {
          display: block;
          margin-top: 5px;
          color: #697586;
          font-size: 8px;
        }

        .nav-title {
          margin: 22px 7px 9px;
          color: #606c7d;
          font-size: 8px;
          letter-spacing: 2px;
        }

        .nav {
          display: grid;
          gap: 5px;
        }

        .nav a {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 43px;
          padding: 0 11px;
          border-radius: 12px;
          color: #8893a2;
          font-size: 10px;
          border: 1px solid transparent;
          transition: .2s;
        }

        .nav a:hover,
        .nav a.active {
          color: #e6bc59;
          border-color: rgba(222,177,75,.15);
          background: rgba(222,177,75,.07);
        }

        .nav-icon {
          width: 26px;
          text-align: center;
          font-size: 14px;
        }

        .side-footer {
          margin-top: 20px;
          padding: 12px;
          border-radius: 14px;
          color: #697586;
          font-size: 8px;
          line-height: 1.9;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.05);
        }

        /* TOP */

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 14px;
          padding: 12px 15px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          background: rgba(12,14,18,.75);
          backdrop-filter: blur(20px);
        }

        .top-title strong {
          display: block;
          font-size: 15px;
        }

        .top-title span {
          display: block;
          margin-top: 4px;
          color: #657184;
          font-size: 8px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-mini {
          width: 245px;
          height: 37px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 11px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.07);
          background: #ffffff03;
        }

        .search-mini input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #ddd;
          background: transparent;
          font-size: 9px;
        }

        .admin-mini {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-mini-avatar {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: #e3b752;
          background: rgba(223,178,74,.08);
          border: 1px solid rgba(223,178,74,.18);
          font-size: 10px;
          font-weight: 900;
        }

        .admin-mini span {
          display: block;
          color: #e7ebf0;
          font-size: 9px;
        }

        .admin-mini small {
          display: block;
          margin-top: 3px;
          color: #647081;
          font-size: 7px;
        }

        /* HEADER */

        .heading {
          margin: 20px 4px 13px;
        }

        .heading .eyebrow {
          color: #d7ac4d;
          font-size: 8px;
          letter-spacing: 3px;
          font-weight: 900;
        }

        .heading h1 {
          margin: 7px 0 4px;
          font-size: clamp(23px, 3vw, 32px);
        }

        .heading p {
          margin: 0;
          color: #6d7889;
          font-size: 9px;
        }

        /* STATS */

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .stat {
          min-height: 100px;
          padding: 15px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.065);
          background:
            linear-gradient(
              145deg,
              rgba(22,25,30,.85),
              rgba(10,12,16,.88)
            );
          box-shadow: 0 15px 40px rgba(0,0,0,.18);
        }

        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #727d8d;
          font-size: 9px;
        }

        .stat-icon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.05);
        }

        .stat-number {
          margin-top: 13px;
          font-size: 23px;
          font-weight: 900;
        }

        .gold {
          color: #e3b952;
        }

        .green {
          color: #3fe09a;
        }

        .red {
          color: #ff6c76;
        }

        /* FILTER */

        .filter {
          margin-top: 15px;
          padding: 12px;
          display: grid;
          grid-template-columns: minmax(180px, 1fr) 150px 150px auto auto;
          gap: 7px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          background: rgba(12,15,20,.7);
        }

        .field {
          min-width: 0;
          height: 40px;
          padding: 0 11px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.07);
          outline: none;
          color: #dce2e9;
          background: #080b10;
          font-size: 9px;
        }

        .field:focus {
          border-color: rgba(224,180,76,.3);
        }

        .btn {
          min-height: 40px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.07);
          color: #aab4c1;
          background: rgba(255,255,255,.025);
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn:hover {
          background: rgba(255,255,255,.055);
        }

        .btn-gold {
          color: #17130b;
          border-color: transparent;
          background:
            linear-gradient(
              135deg,
              #efc967,
              #b98225
            );
        }

        .btn-danger {
          color: #ff7c84;
          border-color: rgba(255,91,104,.15);
          background: rgba(255,70,83,.045);
        }

        .btn-green {
          color: #4de09c;
          border-color: rgba(67,223,152,.16);
          background: rgba(67,223,152,.045);
        }

        .btn-blue {
          color: #71b8ff;
          border-color: rgba(80,150,255,.16);
          background: rgba(80,150,255,.045);
        }

        /* MAIN GRID */

        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
          gap: 14px;
          margin-top: 14px;
        }

        .panel {
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 21px;
          background:
            linear-gradient(
              145deg,
              rgba(15,18,23,.93),
              rgba(7,9,13,.95)
            );
          box-shadow:
            0 25px 65px rgba(0,0,0,.23);
          backdrop-filter: blur(18px);
        }

        .panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .panel-head h2 {
          margin: 0;
          font-size: 13px;
        }

        .panel-head span {
          color: #626e7f;
          font-size: 8px;
        }

        /* USERS */

        .user-list {
          max-height: 760px;
          overflow: auto;
        }

        .user-row {
          display: grid;
          grid-template-columns: 45px minmax(0,1fr) auto;
          gap: 11px;
          align-items: center;
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,.045);
          transition: .2s;
        }

        .user-row:hover {
          background: rgba(255,255,255,.018);
        }

        .user-avatar {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #e4b953;
          font-size: 12px;
          font-weight: 900;
          border: 1px solid rgba(224,180,76,.18);
          background:
            linear-gradient(
              145deg,
              rgba(224,180,76,.13),
              rgba(255,255,255,.02)
            );
        }

        .user-name {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .user-name strong {
          font-size: 11px;
        }

        .role-badge {
          padding: 3px 6px;
          border-radius: 6px;
          color: #e8c365;
          background: rgba(226,180,74,.09);
          border: 1px solid rgba(226,180,74,.13);
          font-size: 7px;
        }

        .user-email {
          margin-top: 5px;
          color: #5f6b7c;
          direction: ltr;
          text-align: right;
          font-size: 8px;
        }

        .user-date {
          margin-top: 4px;
          color: #4f5968;
          font-size: 7px;
        }

        .user-right {
          text-align: left;
        }

        .plan {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 7px;
          color: #dcb456;
          background: rgba(220,180,86,.08);
          border: 1px solid rgba(220,180,86,.12);
          font-size: 8px;
          font-weight: 800;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 7px;
          padding: 5px 8px;
          border-radius: 7px;
          font-size: 7px;
        }

        .status:before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }

        .status-active {
          color: #42dc96;
          background: rgba(66,220,150,.07);
        }

        .status-blocked {
          color: #ff6e77;
          background: rgba(255,110,119,.07);
        }

        .view-btn {
          margin-top: 7px;
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          padding: 0 10px;
          border-radius: 8px;
          color: #d9b04e;
          border: 1px solid rgba(218,174,73,.13);
          background: rgba(218,174,73,.045);
          font-size: 8px;
        }

        /* SELECTED USER */

        .profile {
          padding: 18px;
        }

        .profile-head {
          display: flex;
          align-items: center;
          gap: 13px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .profile-avatar {
          width: 65px;
          height: 65px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 20px;
          color: #e8bc58;
          font-size: 18px;
          font-weight: 900;
          border: 1px solid rgba(226,181,76,.28);
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(228,186,87,.2),
              rgba(255,255,255,.02)
            );
          box-shadow:
            0 15px 35px rgba(0,0,0,.22);
        }

        .profile-head h2 {
          margin: 0;
          font-size: 16px;
        }

        .profile-head p {
          margin: 5px 0 0;
          color: #606c7b;
          direction: ltr;
          text-align: right;
          font-size: 8px;
        }

        .profile-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 9px;
        }

        .info-grid {
          margin-top: 14px;
          display: grid;
          gap: 1px;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.05);
          background: rgba(255,255,255,.04);
        }

        .info-row {
          min-height: 38px;
          display: grid;
          grid-template-columns: 115px 1fr;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          background: #0b0e13;
        }

        .info-row span {
          color: #687486;
          font-size: 8px;
        }

        .info-row strong {
          color: #d9dee5;
          font-size: 9px;
          text-align: left;
        }

        .section-title {
          margin: 17px 0 9px;
          color: #e4e7ec;
          font-size: 10px;
          font-weight: 800;
        }

        /* QUICK ACTIONS */

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 7px;
        }

        .action-card {
          min-height: 75px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 6px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.055);
          background: rgba(255,255,255,.022);
          color: #a9b2be;
          text-align: center;
          font-size: 8px;
        }

        .action-card:hover {
          border-color: rgba(222,177,75,.17);
          color: #e4bb59;
          background: rgba(222,177,75,.035);
        }

        .action-icon {
          font-size: 17px;
        }

        /* SUBSCRIPTION */

        .subscription {
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(223,178,75,.15);
          background:
            linear-gradient(
              135deg,
              rgba(222,177,75,.08),
              rgba(255,255,255,.018)
            );
        }

        .subscription-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .subscription-plan {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .crown {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #e6bb57;
          border: 1px solid rgba(230,187,87,.17);
          background: rgba(230,187,87,.06);
          font-size: 19px;
        }

        .subscription-plan strong {
          display: block;
          color: #e5bb56;
          font-size: 15px;
        }

        .subscription-plan span {
          display: block;
          margin-top: 4px;
          color: #48dc99;
          font-size: 8px;
        }

        .remaining {
          padding: 6px 8px;
          border-radius: 8px;
          color: #55dd9d;
          background: rgba(85,221,157,.07);
          font-size: 8px;
        }

        .sub-details {
          margin-top: 13px;
          display: grid;
          gap: 7px;
        }

        .sub-detail {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #697586;
          font-size: 8px;
        }

        .sub-detail strong {
          color: #cdd4dc;
          font-size: 8px;
          text-align: left;
        }

        /* FORMS */

        .form-card {
          margin-top: 10px;
          padding: 12px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.055);
          background: rgba(255,255,255,.018);
        }

        .form-title {
          margin-bottom: 9px;
          color: #8994a3;
          font-size: 8px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .form-grid.full {
          grid-template-columns: 1fr;
        }

        .form-card select,
        .form-card input,
        .form-card textarea {
          width: 100%;
          min-height: 38px;
          padding: 0 9px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.07);
          outline: none;
          color: #e1e5ea;
          background: #07090d;
          font-size: 8px;
        }

        .form-card textarea {
          min-height: 70px;
          padding-top: 9px;
          resize: vertical;
        }

        .form-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 7px;
        }

        /* SUPPORT */

        .support-list {
          display: grid;
          gap: 7px;
        }

        .support-item {
          padding: 11px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.05);
          background: rgba(255,255,255,.018);
        }

        .support-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .support-head strong {
          font-size: 9px;
        }

        .ticket-status {
          padding: 4px 7px;
          border-radius: 7px;
          font-size: 7px;
        }

        .ticket-open {
          color: #42dc96;
          background: rgba(66,220,150,.07);
        }

        .ticket-pending {
          color: #e4bb58;
          background: rgba(228,187,88,.07);
        }

        .ticket-closed {
          color: #788494;
          background: rgba(255,255,255,.04);
        }

        .support-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: 6px;
          color: #596575;
          font-size: 7px;
        }

        .support-last {
          margin-top: 9px;
          padding: 9px;
          border-radius: 9px;
          color: #9ba6b3;
          background: rgba(0,0,0,.16);
          line-height: 1.9;
          font-size: 8px;
        }

        /* SUB HISTORY */

        .history {
          display: grid;
          gap: 7px;
        }

        .history-item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          padding: 10px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.045);
          background: rgba(255,255,255,.016);
        }

        .history-item strong {
          display: block;
          color: #d9dee5;
          font-size: 9px;
        }

        .history-item span {
          display: block;
          margin-top: 5px;
          color: #606c7b;
          font-size: 7px;
        }

        .history-price {
          text-align: left;
          color: #dcb454;
          font-size: 8px;
        }

        /* FOOTER */

        .footer {
          margin-top: 18px;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #535f6e;
          font-size: 7px;
          border-top: 1px solid rgba(255,255,255,.05);
        }

        .empty {
          padding: 35px 15px;
          text-align: center;
          color: #5f6b7b;
          font-size: 9px;
          line-height: 2;
        }

        @media(max-width:1100px) {
          .shell {
            grid-template-columns: 1fr;
          }

          .sidebar {
            position: static;
            display: none;
          }

          .grid {
            grid-template-columns: 1fr;
          }
        }

        @media(max-width:800px) {
          .page {
            padding: 9px;
          }

          .topbar {
            padding: 10px;
          }

          .search-mini {
            display: none;
          }

          .stats {
            grid-template-columns: repeat(2,1fr);
          }

          .filter {
            grid-template-columns: 1fr 1fr;
          }

          .filter .field:first-child {
            grid-column: 1 / -1;
          }

          .filter .btn {
            width: 100%;
          }

          .user-row {
            grid-template-columns: 42px minmax(0,1fr);
          }

          .user-right {
            grid-column: 2;
            text-align: right;
          }

          .actions-grid {
            grid-template-columns: repeat(2,1fr);
          }
        }

        @media(max-width:520px) {
          .stats {
            gap: 7px;
          }

          .stat {
            min-height: 88px;
            padding: 12px;
          }

          .stat-number {
            font-size: 20px;
          }

          .heading {
            margin-top: 14px;
          }

          .filter {
            grid-template-columns: 1fr;
          }

          .filter .field:first-child {
            grid-column: auto;
          }

          .profile {
            padding: 13px;
          }

          .info-row {
            grid-template-columns: 100px 1fr;
          }

          .actions-grid {
            grid-template-columns: 1fr 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .footer {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="shell">

        {/* =================================================
            MAIN
        ================================================= */}

        <section className="main">

          {/* TOPBAR */}

          <header className="topbar">

            <div className="top-title">
              <strong>
                مدیریت کاربران
              </strong>

              <span>
                کنترل حساب‌ها، اشتراک‌ها، پشتیبانی و دسترسی‌ها
              </span>
            </div>

            <div className="top-actions">

              <form
                action="/admin/users"
                className="search-mini"
              >
                <span>⌕</span>

                <input
                  name="q"
                  defaultValue={q}
                  placeholder="جستجوی کاربر..."
                />
              </form>

              <div className="admin-mini">

                <div className="admin-mini-avatar">
                  {initials(admin.name)}
                </div>

                <div>
                  <span>{admin.name}</span>
                  <small>مدیر سیستم</small>
                </div>

              </div>

            </div>

          </header>

          {/* TITLE */}

          <div className="heading">

            <div className="eyebrow">
              USER DIRECTORY
            </div>

            <h1>
              مدیریت کاربران
            </h1>

            <p>
              حساب کاربران، پلن‌ها، اشتراک‌ها و درخواست‌های پشتیبانی را از
              یک مرکز کنترل کنید.
            </p>

          </div>

          {/* STATS */}

          <section className="stats">

            <div className="stat">

              <div className="stat-top">
                <span>کل کاربران</span>
                <div className="stat-icon">♙</div>
              </div>

              <div className="stat-number">
                {totalUsers}
              </div>

            </div>

            <div className="stat">

              <div className="stat-top">
                <span>اشتراک فعال</span>
                <div className="stat-icon">♛</div>
              </div>

              <div className="stat-number gold">
                {activeSubscriptions}
              </div>

            </div>

            <div className="stat">

              <div className="stat-top">
                <span>درخواست پشتیبانی</span>
                <div className="stat-icon">●</div>
              </div>

              <div className="stat-number">
                {openTickets}
              </div>

            </div>

            <div className="stat">

              <div className="stat-top">
                <span>حساب مسدود</span>
                <div className="stat-icon">!</div>
              </div>

              <div className="stat-number red">
                {blockedUsers}
              </div>

            </div>

          </section>

          {/* FILTER */}

          <form
            action="/admin/users"
            className="filter"
          >

            <input
              className="field"
              name="q"
              defaultValue={q}
              placeholder="نام یا ایمیل کاربر..."
            />

            <select
              className="field"
              name="plan"
              defaultValue={planFilter}
            >
              <option value="">
                همه پلن‌ها
              </option>

              <option value="FREE">
                رایگان
              </option>

              <option value="BASIC">
                پایه
              </option>

              <option value="PRO">
                حرفه‌ای
              </option>

              <option value="PREMIUM">
                Premium
              </option>

              <option value="VIP">
                VIP
              </option>
            </select>

            <select
              className="field"
              name="status"
              defaultValue={statusFilter}
            >
              <option value="">
                همه وضعیت‌ها
              </option>

              <option value="ACTIVE">
                فعال
              </option>

              <option value="BLOCKED">
                مسدود
              </option>
            </select>

            <button
              type="submit"
              className="btn btn-gold"
            >
              جستجو
            </button>

            <Link
              href="/admin/users"
              className="btn"
            >
              پاک کردن
            </Link>

          </form>

          {/* MAIN GRID */}

          <section className="grid">

            {/* USER DIRECTORY */}

            <section className="panel">

              <div className="panel-head">

                <div>
                  <h2>
                    لیست کاربران
                  </h2>

                  <span>
                    {users.length} نتیجه
                  </span>
                </div>

              </div>

              <div className="user-list">

                {users.length === 0 ? (
                  <div className="empty">
                    کاربری با این مشخصات پیدا نشد.
                  </div>
                ) : (
                  users.map((user) => (

                    <article
                      key={user.id}
                      className="user-row"
                    >

                      <div className="user-avatar">
                        {user.avatarEmoji ||
                          initials(user.name)}
                      </div>

                      <div>

                        <div className="user-name">

                          <strong>
                            {user.name}
                          </strong>

                          {user.role === "ADMIN" && (
                            <span className="role-badge">
                              ADMIN
                            </span>
                          )}

                        </div>

                        <div className="user-email">
                          {user.email}
                        </div>

                        <div className="user-date">
                          عضویت: {dateOnly(user.createdAt)}
                        </div>

                      </div>

                      <div className="user-right">

                        <div className="plan">
                          {planLabel(user.plan)}
                        </div>

                        <div
                          className={
                            user.isBlocked
                              ? "status status-blocked"
                              : "status status-active"
                          }
                        >
                          {user.isBlocked
                            ? "مسدود"
                            : "فعال"}
                        </div>

                        <Link
                          href={`/admin/users?user=${encodeURIComponent(
                            user.id,
                          )}`}
                          className="view-btn"
                        >
                          مدیریت ←
                        </Link>

                      </div>

                    </article>

                  ))
                )}

              </div>

            </section>

            {/* USER DETAIL */}

            <section className="panel">

              {!selected ? (
                <div className="empty">
                  هنوز کاربری برای نمایش وجود ندارد.
                </div>
              ) : (

                <>

                  {/* PROFILE */}

                  <div className="profile">

                    <div className="profile-head">

                      <div className="profile-avatar">
                        {selected.avatarEmoji ||
                          initials(selected.name)}
                      </div>

                      <div>

                        <h2>
                          {selected.name}
                        </h2>

                        <p>
                          {selected.email}
                        </p>

                        <div className="profile-badges">

                          <span
                            className={
                              selected.isBlocked
                                ? "status status-blocked"
                                : "status status-active"
                            }
                          >
                            {selected.isBlocked
                              ? "حساب مسدود"
                              : "حساب فعال"}
                          </span>

                          <span className="plan">
                            {planLabel(
                              selected.plan,
                            )}
                          </span>

                        </div>

                      </div>

                    </div>

                    {/* INFO */}

                    <div className="section-title">
                      اطلاعات حساب
                    </div>

                    <div className="info-grid">

                      <div className="info-row">
                        <span>
                          نام کامل
                        </span>

                        <strong>
                          {selected.name}
                        </strong>
                      </div>

                      <div className="info-row">
                        <span>
                          ایمیل
                        </span>

                        <strong>
                          {selected.email}
                        </strong>
                      </div>

                      <div className="info-row">
                        <span>
                          تاریخ ثبت‌نام
                        </span>

                        <strong>
                          {dateText(
                            selected.createdAt,
                          )}
                        </strong>
                      </div>

                      <div className="info-row">
                        <span>
                          آخرین بروزرسانی
                        </span>

                        <strong>
                          {dateText(
                            selected.updatedAt,
                          )}
                        </strong>
                      </div>

                      <div className="info-row">
                        <span>
                          نقش
                        </span>

                        <strong>
                          {selected.role === "ADMIN"
                            ? "مدیر سیستم"
                            : "کاربر"}
                        </strong>
                      </div>

                      <div className="info-row">
                        <span>
                          وضعیت حساب
                        </span>

                        <strong>
                          {selected.isBlocked
                            ? "مسدود"
                            : "فعال"}
                        </strong>
                      </div>

                    </div>

                    {/* QUICK ACTIONS */}

                    <div className="section-title">
                      عملیات سریع
                    </div>

                    <div className="actions-grid">

                      <Link
                        href={`/admin/support?user=${encodeURIComponent(
                          selected.id,
                        )}`}
                        className="action-card"
                      >
                        <span className="action-icon">
                          ●
                        </span>

                        <span>
                          پیام به کاربر
                        </span>
                      </Link>

                      <a
                        href="#subscription"
                        className="action-card"
                      >
                        <span className="action-icon">
                          ♛
                        </span>

                        <span>
                          مدیریت اشتراک
                        </span>
                      </a>

                      <a
                        href="#support"
                        className="action-card"
                      >
                        <span className="action-icon">
                          ◈
                        </span>

                        <span>
                          درخواست‌ها
                        </span>
                      </a>

                      <Link
                        href="/telegram"
                        className="action-card"
                      >
                        <span className="action-icon">
                          ✦
                        </span>

                        <span>
                          کانال سیگنال
                        </span>
                      </Link>

                    </div>

                    {/* BLOCK CONTROL */}

                    {selected.role !== "ADMIN" && (
                      <div className="form-card">

                        <div className="form-title">
                          کنترل دسترسی حساب
                        </div>

                        <form action={toggleUserBlock}>

                          <input
                            type="hidden"
                            name="userId"
                            value={selected.id}
                          />

                          <input
                            type="hidden"
                            name="mode"
                            value={
                              selected.isBlocked
                                ? "UNBLOCK"
                                : "BLOCK"
                            }
                          />

                          {!selected.isBlocked && (
                            <textarea
                              name="reason"
                              placeholder="دلیل مسدودسازی حساب..."
                              maxLength={500}
                            />
                          )}

                          <div className="form-actions">

                            <button
                              type="submit"
                              className={
                                selected.isBlocked
                                  ? "btn btn-green"
                                  : "btn btn-danger"
                              }
                            >
                              {selected.isBlocked
                                ? "رفع مسدودی حساب"
                                : "مسدود کردن حساب"}
                            </button>

                          </div>

                        </form>

                      </div>
                    )}

                    {/* PLAN */}

                    <div
                      id="subscription"
                      className="section-title"
                    >
                      اشتراک و پلن فعلی
                    </div>

                    <div className="subscription">

                      <div className="subscription-top">

                        <div className="subscription-plan">

                          <div className="crown">
                            ♛
                          </div>

                          <div>

                            <strong>
                              {planLabel(
                                selected.plan,
                              )}
                            </strong>

                            <span>
                              {selectedSubscriptionActive
                                ? "اشتراک فعال"
                                : selected.plan ===
                                    "FREE"
                                  ? "حساب رایگان"
                                  : "اشتراک منقضی یا بدون تاریخ"}
                            </span>

                          </div>

                        </div>

                        {selectedSubscriptionActive &&
                          selectedDays !== null && (
                            <div className="remaining">
                              {selectedDays > 0
                                ? `${selectedDays} روز باقی‌مانده`
                                : "منقضی"}
                            </div>
                          )}

                      </div>

                      <div className="sub-details">

                        <div className="sub-detail">
                          <span>
                            تاریخ شروع
                          </span>

                          <strong>
                            {dateOnly(
                              selected.subscriptionStartedAt,
                            )}
                          </strong>
                        </div>

                        <div className="sub-detail">
                          <span>
                            تاریخ انقضا
                          </span>

                          <strong>
                            {dateOnly(
                              selected.subscriptionExpiresAt,
                            )}
                          </strong>
                        </div>

                      </div>

                    </div>

                    {/* PLAN FORM */}

                    <div className="form-card">

                      <div className="form-title">
                        تغییر پلن کاربر
                      </div>

                      <form action={changeUserPlan}>

                        <input
                          type="hidden"
                          name="userId"
                          value={selected.id}
                        />

                        <div className="form-grid">

                          <select
                            name="plan"
                            defaultValue={
                              selected.plan
                            }
                          >
                            <option value="FREE">
                              رایگان
                            </option>

                            <option value="BASIC">
                              پایه
                            </option>

                            <option value="PRO">
                              حرفه‌ای
                            </option>

                            <option value="PREMIUM">
                              Premium
                            </option>

                            <option value="VIP">
                              VIP
                            </option>
                          </select>

                          <button
                            type="submit"
                            className="btn btn-gold"
                          >
                            ذخیره پلن
                          </button>

                        </div>

                      </form>

                    </div>

                    {/* SUBSCRIPTION FORM */}

                    <div className="form-card">

                      <div className="form-title">
                        فعال‌سازی یا تمدید واقعی اشتراک
                      </div>

                      <form action={saveSubscription}>

                        <input
                          type="hidden"
                          name="userId"
                          value={selected.id}
                        />

                        <div className="form-grid">

                          <select
                            name="plan"
                            defaultValue={
                              selected.plan ===
                              "FREE"
                                ? "VIP"
                                : selected.plan
                            }
                          >
                            <option value="BASIC">
                              پایه
                            </option>

                            <option value="PRO">
                              حرفه‌ای
                            </option>

                            <option value="PREMIUM">
                              Premium
                            </option>

                            <option value="VIP">
                              VIP
                            </option>
                          </select>

                          <input
                            name="days"
                            type="number"
                            min="1"
                            max="3650"
                            defaultValue="30"
                            placeholder="تعداد روز"
                            required
                          />

                          <input
                            name="price"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="مبلغ"
                          />

                          <select
                            name="currency"
                            defaultValue="IRR"
                          >
                            <option value="IRR">
                              تومان / IRR
                            </option>

                            <option value="USD">
                              دلار / USD
                            </option>

                            <option value="EUR">
                              یورو / EUR
                            </option>
                          </select>

                        </div>

                        <div
                          className="form-grid full"
                          style={{
                            marginTop: 7,
                          }}
                        >

                          <textarea
                            name="note"
                            placeholder="یادداشت مدیر درباره این اشتراک..."
                            maxLength={1000}
                          />

                        </div>

                        <div className="form-actions">

                          <button
                            type="submit"
                            className="btn btn-gold"
                          >
                            فعال‌سازی / تمدید اشتراک
                          </button>

                        </div>

                      </form>

                    </div>

                    {/* CANCEL */}

                    {selectedSubscriptionActive && (
                      <div className="form-card">

                        <form action={cancelSubscription}>

                          <input
                            type="hidden"
                            name="userId"
                            value={selected.id}
                          />

                          <button
                            type="submit"
                            className="btn btn-danger"
                          >
                            لغو اشتراک فعال
                          </button>

                        </form>

                      </div>
                    )}

                    {/* SUPPORT */}

                    <div
                      id="support"
                      className="section-title"
                    >
                      درخواست‌های پشتیبانی کاربر
                    </div>

                    <div className="support-list">

                      {selected.supportTickets.length ===
                      0 ? (
                        <div className="empty">
                          این کاربر هنوز درخواست پشتیبانی
                          ثبت نکرده است.
                        </div>
                      ) : (
                        selected.supportTickets.map(
                          (ticket) => {

                            const lastMessage =
                              ticket.messages[
                                ticket.messages.length -
                                  1
                              ];

                            const ticketStatusClass =
                              ticket.status === "OPEN"
                                ? "ticket-status ticket-open"
                                : ticket.status ===
                                    "PENDING"
                                  ? "ticket-status ticket-pending"
                                  : "ticket-status ticket-closed";

                            return (
                              <div
                                key={ticket.id}
                                className="support-item"
                              >

                                <div className="support-head">

                                  <strong>
                                    {ticket.subject}
                                  </strong>

                                  <span
                                    className={
                                      ticketStatusClass
                                    }
                                  >
                                    {statusLabel(
                                      ticket.status,
                                    )}
                                  </span>

                                </div>

                                <div className="support-meta">

                                  <span>
                                    {dateText(
                                      ticket.createdAt,
                                    )}
                                  </span>

                                  <span>
                                    {
                                      ticket.messages
                                        .length
                                    }{" "}
                                    پیام
                                  </span>

                                </div>

                                {lastMessage && (
                                  <div className="support-last">
                                    {lastMessage.message}
                                  </div>
                                )}

                                <div
                                  className="form-actions"
                                  style={{
                                    marginTop: 8,
                                  }}
                                >

                                  <Link
                                    href={`/admin/support?user=${encodeURIComponent(
                                      selected.id,
                                    )}`}
                                    className="btn btn-blue"
                                  >
                                    مشاهده و پاسخ
                                  </Link>

                                  {ticket.status !==
                                    "CLOSED" && (
                                    <form
                                      action={
                                        closeTicket
                                      }
                                    >

                                      <input
                                        type="hidden"
                                        name="ticketId"
                                        value={
                                          ticket.id
                                        }
                                      />

                                      <input
                                        type="hidden"
                                        name="userId"
                                        value={
                                          selected.id
                                        }
                                      />

                                      <button
                                        type="submit"
                                        className="btn btn-danger"
                                      >
                                        بستن
                                      </button>

                                    </form>
                                  )}

                                </div>

                              </div>
                            );
                          },
                        )
                      )}

                    </div>

                    {/* SUBSCRIPTION HISTORY */}

                    <div className="section-title">
                      سابقه اشتراک‌ها
                    </div>

                    <div className="history">

                      {selected.subscriptions.length ===
                      0 ? (
                        <div className="empty">
                          سابقه اشتراکی برای این کاربر
                          ثبت نشده است.
                        </div>
                      ) : (
                        selected.subscriptions.map(
                          (subscription) => (
                            <div
                              key={subscription.id}
                              className="history-item"
                            >

                              <div>

                                <strong>
                                  {planLabel(
                                    subscription.plan,
                                  )}{" "}
                                  ·{" "}
                                  {statusLabel(
                                    subscription.status,
                                  )}
                                </strong>

                                <span>
                                  {dateOnly(
                                    subscription.startsAt,
                                  )}{" "}
                                  تا{" "}
                                  {dateOnly(
                                    subscription.expiresAt,
                                  )}
                                </span>

                              </div>

                              <div className="history-price">
                                {subscription.price == null
                                  ? "—"
                                  : subscription.price.toLocaleString(
                                      "fa-IR",
                                    )}
                                {subscription.currency
                                  ? ` ${subscription.currency}`
                                  : ""}
                              </div>

                            </div>
                          ),
                        )
                      )}

                    </div>

                    {/* REAL DATA SUMMARY */}

                    <div className="section-title">
                      خلاصه فعالیت پشتیبانی
                    </div>

                    <div className="info-grid">

                      <div className="info-row">
                        <span>
                          کل درخواست‌ها
                        </span>

                        <strong>
                          {totalSupportTickets}
                        </strong>
                      </div>

                      <div className="info-row">
                        <span>
                          درخواست‌های باز
                        </span>

                        <strong>
                          {selectedOpenTickets}
                        </strong>
                      </div>

                      <div className="info-row">
                        <span>
                          تعداد پیام‌ها
                        </span>

                        <strong>
                          {selectedMessages}
                        </strong>
                      </div>

                      <div className="info-row">
                        <span>
                          وضعیت مهمان
                        </span>

                        <strong>
                          {selected.guestUsed
                            ? selected.guestExpiresAt &&
                              selected.guestExpiresAt >
                                new Date()
                              ? `فعال تا ${dateOnly(
                                  selected.guestExpiresAt,
                                )}`
                              : "استفاده شده"
                            : "استفاده نشده"}
                        </strong>
                      </div>

                    </div>

                  </div>

                </>

              )}

            </section>

          </section>

          {/* FOOTER */}

          <footer className="footer">

            <span>
              Trading AI Admin Panel · 1.0.0
            </span>

            <span>
              تمام اطلاعات این صفحه از دیتابیس سیستم خوانده می‌شود.
            </span>

          </footer>

        </section>

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="sidebar">

          <Link
            href="/admin"
            className="brand"
          >

            <div className="brand-logo">
              AI
            </div>

            <div>
              <strong>
                Trading AI
              </strong>

              <small>
                پنل مدیریت
              </small>
            </div>

          </Link>

          <div className="nav-title">
            CONTROL CENTER
          </div>

          <nav className="nav">

            <Link href="/admin">
              <span className="nav-icon">
                ⌂
              </span>
              داشبورد
            </Link>

            <Link
              href="/admin/users"
              className="active"
            >
              <span className="nav-icon">
                ♙
              </span>
              کاربران
            </Link>

            <Link href="/admin/support">
              <span className="nav-icon">
                ●
              </span>
              پشتیبانی
            </Link>

            <Link href="/payments">
              <span className="nav-icon">
                ▣
              </span>
              اشتراک‌ها
            </Link>

            <Link href="/telegram">
              <span className="nav-icon">
                ♛
              </span>
              کانال سیگنال
            </Link>

            <Link href="/admin">
              <span className="nav-icon">
                ⚙
              </span>
              تنظیمات
            </Link>

            <Link href="/admin">
              <span className="nav-icon">
                ▥
              </span>
              گزارش‌ها
            </Link>

          </nav>

          <div className="side-footer">
            مدیر سیستم فقط از این بخش می‌تواند حساب کاربران، اشتراک‌ها و
            درخواست‌های پشتیبانی را مدیریت کند.
          </div>

        </aside>

      </div>
    </main>
  );
}
