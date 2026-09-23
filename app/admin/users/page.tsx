import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type SearchParams = {
  q?: string;
  plan?: string;
  status?: string;
  user?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

const PLANS = ["FREE", "VIP", "PREMIUM", "PRO"] as const;

function getText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(date: Date | null | undefined): string {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatMoney(
  value: number | null | undefined,
  currency: string | null | undefined
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${formatNumber(value)} ${currency || "تومان"}`;
}

function planName(plan: string | null | undefined): string {
  switch (plan) {
    case "VIP":
      return "VIP";
    case "PREMIUM":
      return "Premium";
    case "PRO":
      return "Pro";
    default:
      return "Free";
  }
}

function ticketStatusName(status: string): string {
  switch (status) {
    case "OPEN":
      return "باز";
    case "IN_PROGRESS":
      return "در حال بررسی";
    case "ANSWERED":
      return "پاسخ داده شده";
    case "CLOSED":
      return "بسته";
    default:
      return status;
  }
}

function ticketStatusClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "ticket-open";
    case "IN_PROGRESS":
      return "ticket-progress";
    case "ANSWERED":
      return "ticket-answered";
    case "CLOSED":
      return "ticket-closed";
    default:
      return "ticket-default";
  }
}

async function requireAdmin() {
  const session = await getSession();

  if (!session) {
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

/* -------------------------------------------------------------------------- */
/* SERVER ACTIONS                                                            */
/* -------------------------------------------------------------------------- */

async function blockUser(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const userId = getText(formData.get("userId"));
  const reason =
    getText(formData.get("reason")) || "حساب توسط مدیریت مسدود شد.";

  if (!userId) {
    redirect("/admin/users");
  }

  if (userId === admin.id) {
    redirect("/admin/users?error=self");
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isBlocked: true,
      blockedAt: new Date(),
      blockedReason: reason,
    },
  });

  // حذف Session های فعال کاربر
  await prisma.session.deleteMany({
    where: {
      userId,
    },
  });

  // ثبت اعلان واقعی برای کاربر
  await prisma.userNotification.create({
    data: {
      userId,
      type: "ACCOUNT_BLOCKED",
      title: "حساب شما مسدود شد",
      message: reason,
      dedupeKey: `account-blocked-${userId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function unblockUser(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = getText(formData.get("userId"));

  if (!userId) {
    redirect("/admin/users");
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isBlocked: false,
      blockedAt: null,
      blockedReason: null,
    },
  });

  await prisma.userNotification.create({
    data: {
      userId,
      type: "ACCOUNT_UNBLOCKED",
      title: "حساب شما فعال شد",
      message: "حساب کاربری شما توسط مدیریت فعال شد.",
      dedupeKey: `account-unblocked-${userId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function changePlan(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = getText(formData.get("userId"));
  const plan = getText(formData.get("plan"));

  if (!userId || !PLANS.includes(plan as (typeof PLANS)[number])) {
    redirect("/admin/users");
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      plan,
    },
  });

  await prisma.userNotification.create({
    data: {
      userId,
      type: "PLAN_CHANGED",
      title: "پلن حساب شما تغییر کرد",
      message: `پلن حساب شما به ${planName(plan)} تغییر کرد.`,
      dedupeKey: `plan-changed-${userId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function createSubscription(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = getText(formData.get("userId"));
  const plan = getText(formData.get("plan"));
  const daysText = getText(formData.get("days"));
  const priceText = getText(formData.get("price"));
  const currency = getText(formData.get("currency")) || "تومان";
  const note = getText(formData.get("note"));

  if (!userId || !PLANS.includes(plan as (typeof PLANS)[number])) {
    redirect("/admin/users");
  }

  const parsedDays = Number(daysText || "30");
  const days =
    Number.isFinite(parsedDays) && parsedDays > 0
      ? Math.floor(parsedDays)
      : 30;

  let price: number | null = null;

  if (priceText) {
    const parsedPrice = Number(priceText);

    if (Number.isFinite(parsedPrice) && parsedPrice >= 0) {
      price = parsedPrice;
    }
  }

  const now = new Date();

  const activeSubscription =
    await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        expiresAt: "desc",
      },
    });

  const startsAt = activeSubscription?.expiresAt || now;

  const expiresAt = new Date(
    startsAt.getTime() + days * 24 * 60 * 60 * 1000
  );

  await prisma.userSubscription.create({
    data: {
      userId,
      plan,
      status: "ACTIVE",
      startsAt,
      expiresAt,
      price,
      currency,
      autoRenew: false,
      note: note || null,
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      subscriptionStartedAt: true,
    },
  });

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      plan,
      subscriptionStartedAt:
        user?.subscriptionStartedAt &&
        user.subscriptionStartedAt <= startsAt
          ? user.subscriptionStartedAt
          : startsAt,
      subscriptionExpiresAt: expiresAt,
    },
  });

  await prisma.userNotification.create({
    data: {
      userId,
      type: "SUBSCRIPTION_CREATED",
      title: "اشتراک شما فعال شد",
      message: `اشتراک ${planName(
        plan
      )} تا ${formatDate(expiresAt)} فعال است.`,
      dedupeKey: `subscription-created-${userId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function cancelSubscription(formData: FormData) {
  "use server";

  await requireAdmin();

  const subscriptionId = getText(formData.get("subscriptionId"));
  const userId = getText(formData.get("userId"));

  if (!subscriptionId || !userId) {
    redirect("/admin/users");
  }

  await prisma.userSubscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      autoRenew: false,
    },
  });

  await prisma.userNotification.create({
    data: {
      userId,
      type: "SUBSCRIPTION_CANCELLED",
      title: "اشتراک شما لغو شد",
      message:
        "تمدید خودکار اشتراک شما توسط مدیریت لغو شد. دسترسی باقی‌مانده تا تاریخ انقضا ادامه دارد.",
      dedupeKey: `subscription-cancelled-${subscriptionId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function sendUserMessage(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = getText(formData.get("userId"));
  const title = getText(formData.get("title"));
  const message = getText(formData.get("message"));

  if (!userId || !title || !message) {
    redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
  }

  await prisma.userNotification.create({
    data: {
      userId,
      type: "ADMIN_MESSAGE",
      title,
      message,
      dedupeKey: `admin-message-${userId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function changeTicketStatus(formData: FormData) {
  "use server";

  await requireAdmin();

  const ticketId = getText(formData.get("ticketId"));
  const userId = getText(formData.get("userId"));
  const status = getText(formData.get("status"));

  if (!ticketId || !userId || !status) {
    redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
  }

  await prisma.supportTicket.update({
    where: {
      id: ticketId,
    },
    data: {
      status,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                      */
/* -------------------------------------------------------------------------- */

export default async function AdminUsersPage({
  searchParams,
}: PageProps) {
  const admin = await requireAdmin();

  const params = searchParams ? await searchParams : {};

  const q = params.q?.trim() || "";
  const planFilter = params.plan || "";
  const statusFilter = params.status || "";
  const requestedUserId = params.user || "";

  const now = new Date();

  const userWhere = {
    ...(q
      ? {
          OR: [
            {
              name: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(planFilter
      ? {
          plan: planFilter,
        }
      : {}),
    ...(statusFilter === "BLOCKED"
      ? {
          isBlocked: true,
        }
      : {}),
    ...(statusFilter === "ACTIVE"
      ? {
          isBlocked: false,
        }
      : {}),
  };

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
          gt: now,
        },
      },
    }),

    prisma.supportTicket.count({
      where: {
        status: {
          not: "CLOSED",
        },
      },
    }),

    prisma.user.findMany({
      where: userWhere,
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
        isBlocked: true,
        blockedAt: true,
        blockedReason: true,
        subscriptionStartedAt: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            supportTickets: true,
            tradingBots: true,
            tradingSignals: true,
            trades: true,
            subscriptions: true,
          },
        },
      },
    }),
  ]);

  const selectedId =
    requestedUserId &&
    users.some((user) => user.id === requestedUserId)
      ? requestedUserId
      : users[0]?.id || "";

  const selectedUser = selectedId
    ? await prisma.user.findUnique({
        where: {
          id: selectedId,
        },
        include: {
          subscriptions: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },

          supportTickets: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 10,
            include: {
              messages: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 5,
              },
            },
          },

          _count: {
            select: {
              supportTickets: true,
              tradingBots: true,
              tradingSignals: true,
              trades: true,
              subscriptions: true,
              notifications: true,
            },
          },
        },
      })
    : null;

  const currentSubscription = selectedUser?.subscriptions.find(
    (subscription) =>
      subscription.status === "ACTIVE" &&
      subscription.expiresAt > now
  );

  const subscriptionActive = Boolean(currentSubscription);

  return (
    <div className="admin-page" dir="rtl">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">✦</div>

          <div className="brand-text">
            <strong>Trading AI</strong>
            <span>ADMIN PANEL</span>
          </div>
        </div>

        <nav className="navigation">
          <Link href="/admin" className="nav-link">
            <span>⌂</span>
            <b>داشبورد</b>
          </Link>

          <Link
            href="/admin/users"
            className="nav-link active"
          >
            <span>♙</span>
            <b>کاربران</b>
          </Link>

          <Link href="/admin/support" className="nav-link">
            <span>◉</span>
            <b>پشتیبانی</b>
          </Link>

          <Link
            href="/admin/subscriptions"
            className="nav-link"
          >
            <span>◆</span>
            <b>اشتراک‌ها</b>
          </Link>

          <Link href="/admin/signals" className="nav-link">
            <span>↗</span>
            <b>کانال سیگنال VIP</b>
          </Link>

          <Link href="/admin/settings" className="nav-link">
            <span>⚙</span>
            <b>تنظیمات</b>
          </Link>

          <Link href="/admin/reports" className="nav-link">
            <span>▦</span>
            <b>گزارش‌ها</b>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-user">
            <div className="admin-avatar">
              {(admin.name || "A").charAt(0)}
            </div>

            <div>
              <strong>{admin.name}</strong>
              <span>مدیر سیستم</span>
            </div>
          </div>

          <Link href="/logout" className="logout-link">
            ⇥ خروج از حساب
          </Link>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <div className="breadcrumb">
              پنل مدیریت <span>›</span> مدیریت کاربران
            </div>

            <h1>مدیریت کاربران</h1>

            <p>
              مدیریت حساب‌ها، اشتراک‌ها، پشتیبانی و دسترسی کاربران
            </p>
          </div>

          <div className="header-admin">
            <div className="notification-button">♧</div>

            <div className="admin-chip">
              <div className="mini-avatar">
                {(admin.name || "A").charAt(0)}
              </div>

              <div>
                <strong>{admin.name}</strong>
                <span>Administrator</span>
              </div>
            </div>
          </div>
        </header>

        <section className="stats">
          <div className="stat">
            <div className="stat-icon gold">♙</div>

            <div>
              <span>کاربران کل</span>
              <strong>{formatNumber(totalUsers)}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon green">✓</div>

            <div>
              <span>اشتراک فعال</span>
              <strong>{formatNumber(activeSubscriptions)}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon orange">◉</div>

            <div>
              <span>تیکت‌های باز</span>
              <strong>{formatNumber(openTickets)}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon red">!</div>

            <div>
              <span>کاربران مسدود</span>
              <strong>{formatNumber(blockedUsers)}</strong>
            </div>
          </div>
        </section>

        <section className="filter-box">
          <form method="get" className="filter-form">
            <div className="search">
              <span>⌕</span>

              <input
                name="q"
                defaultValue={q}
                placeholder="جستجو با نام یا ایمیل..."
              />
            </div>

            <select
              name="plan"
              defaultValue={planFilter}
            >
              <option value="">همه پلن‌ها</option>
              <option value="FREE">Free</option>
              <option value="VIP">VIP</option>
              <option value="PREMIUM">Premium</option>
              <option value="PRO">Pro</option>
            </select>

            <select
              name="status"
              defaultValue={statusFilter}
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="ACTIVE">فعال</option>
              <option value="BLOCKED">مسدود</option>
            </select>

            <button type="submit" className="gold-button">
              جستجو
            </button>

            <Link href="/admin/users" className="clear-button">
              پاک کردن
            </Link>
          </form>
        </section>

        <div className="layout">
          <section className="users-card card">
            <div className="card-title">
              <div>
                <h2>لیست کاربران</h2>
                <span>
                  {formatNumber(users.length)} کاربر
                </span>
              </div>
            </div>

            <div className="users">
              {users.length === 0 ? (
                <div className="empty">
                  <div>⌕</div>
                  <strong>کاربری پیدا نشد</strong>
                  <span>
                    فیلتر یا عبارت جستجو را تغییر دهید.
                  </span>
                </div>
              ) : (
                users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users?user=${encodeURIComponent(
                      user.id
                    )}`}
                    className={`user ${
                      user.id === selectedId ? "selected" : ""
                    }`}
                  >
                    <div className="user-avatar">
                      {(user.name || "U").charAt(0)}
                    </div>

                    <div className="user-details">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>

                    <div className="user-status">
                      <span className={`plan ${user.plan}`}>
                        {planName(user.plan)}
                      </span>

                      <small
                        className={
                          user.isBlocked
                            ? "blocked"
                            : "active"
                        }
                      >
                        {user.isBlocked ? "مسدود" : "فعال"}
                      </small>
                    </div>

                    <div className="arrow">‹</div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {selectedUser ? (
            <section className="details">
              <div className="profile card">
                <div className="profile-head">
                  <div className="profile-avatar">
                    {(selectedUser.name || "U").charAt(0)}
                  </div>

                  <div className="profile-info">
                    <div className="profile-name">
                      <h2>{selectedUser.name}</h2>

                      {selectedUser.isBlocked ? (
                        <span className="danger-badge">
                          مسدود
                        </span>
                      ) : (
                        <span className="success-badge">
                          فعال
                        </span>
                      )}
                    </div>

                    <p>{selectedUser.email}</p>

                    <div className="meta">
                      <span>
                        تاریخ عضویت:{" "}
                        {formatShortDate(
                          selectedUser.createdAt
                        )}
                      </span>

                      <span>
                        آخرین بروزرسانی:{" "}
                        {formatDate(
                          selectedUser.updatedAt
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="current-plan">
                    <span>پلن فعلی</span>
                    <strong>
                      {planName(selectedUser.plan)}
                    </strong>
                  </div>
                </div>

                {selectedUser.isBlocked &&
                selectedUser.blockedReason ? (
                  <div className="blocked-box">
                    <strong>علت مسدودی:</strong>
                    <span>
                      {selectedUser.blockedReason}
                    </span>
                  </div>
                ) : null}

                <div className="profile-stats">
                  <div>
                    <span>ربات‌ها</span>
                    <strong>
                      {formatNumber(
                        selectedUser._count.tradingBots
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>سیگنال‌ها</span>
                    <strong>
                      {formatNumber(
                        selectedUser._count.tradingSignals
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>معاملات</span>
                    <strong>
                      {formatNumber(
                        selectedUser._count.trades
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>تیکت‌ها</span>
                    <strong>
                      {formatNumber(
                        selectedUser._count.supportTickets
                      )}
                    </strong>
                  </div>
                </div>

                <div className="actions">
                  <a
                    href="#message"
                    className="action"
                  >
                    ✉ پیام به کاربر
                  </a>

                  <a
                    href="#subscription"
                    className="action"
                  >
                    ◆ مدیریت اشتراک
                  </a>

                  <a
                    href="#plan"
                    className="action"
                  >
                    ✎ تغییر پلن
                  </a>

                  {selectedUser.isBlocked ? (
                    <form action={unblockUser}>
                      <input
                        type="hidden"
                        name="userId"
                        value={selectedUser.id}
                      />

                      <button
                        type="submit"
                        className="action unblock"
                      >
                        ✓ فعال کردن حساب
                      </button>
                    </form>
                  ) : (
                    <form action={blockUser}>
                      <input
                        type="hidden"
                        name="userId"
                        value={selectedUser.id}
                      />

                      <input
                        type="hidden"
                        name="reason"
                        value="حساب توسط مدیریت مسدود شد."
                      />

                      <button
                        type="submit"
                        className="action danger"
                      >
                        ⊘ مسدود کردن حساب
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="columns">
                <section className="card support">
                  <div className="card-title">
                    <div>
                      <h2>درخواست‌های پشتیبانی</h2>
                      <span>
                        {formatNumber(
                          selectedUser.supportTickets.length
                        )}{" "}
                        درخواست
                      </span>
                    </div>

                    <Link
                      href="/admin/support"
                      className="gold-link"
                    >
                      مشاهده همه
                    </Link>
                  </div>

                  <div className="tickets">
                    {selectedUser.supportTickets.length ===
                    0 ? (
                      <div className="empty compact">
                        <div>✓</div>
                        <strong>
                          درخواست پشتیبانی ندارد
                        </strong>
                        <span>
                          برای این کاربر هنوز تیکتی ثبت نشده است.
                        </span>
                      </div>
                    ) : (
                      selectedUser.supportTickets.map(
                        (ticket) => {
                          const lastMessage =
                            ticket.messages[0];

                          return (
                            <div
                              className="ticket"
                              key={ticket.id}
                            >
                              <div className="ticket-icon">
                                ✉
                              </div>

                              <div className="ticket-content">
                                <div className="ticket-top">
                                  <strong>
                                    {ticket.subject}
                                  </strong>

                                  <span
                                    className={`ticket-status ${ticketStatusClass(
                                      ticket.status
                                    )}`}
                                  >
                                    {ticketStatusName(
                                      ticket.status
                                    )}
                                  </span>
                                </div>

                                <p>
                                  {lastMessage?.message ||
                                    "هنوز پیامی ارسال نشده است."}
                                </p>

                                <div className="ticket-bottom">
                                  <span>
                                    آخرین پیام:{" "}
                                    {formatDate(
                                      lastMessage?.createdAt ||
                                        ticket.updatedAt
                                    )}
                                  </span>

                                  <form
                                    action={
                                      changeTicketStatus
                                    }
                                    className="status-form"
                                  >
                                    <input
                                      type="hidden"
                                      name="ticketId"
                                      value={ticket.id}
                                    />

                                    <input
                                      type="hidden"
                                      name="userId"
                                      value={
                                        selectedUser.id
                                      }
                                    />

                                    <select
                                      name="status"
                                      defaultValue={
                                        ticket.status
                                      }
                                    >
                                      <option value="OPEN">
                                        باز
                                      </option>

                                      <option value="IN_PROGRESS">
                                        در حال بررسی
                                      </option>

                                      <option value="ANSWERED">
                                        پاسخ داده شده
                                      </option>

                                      <option value="CLOSED">
                                        بسته
                                      </option>
                                    </select>

                                    <button
                                      type="submit"
                                      className="status-button"
                                    >
                                      ذخیره
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </section>

                <section
                  className="card subscription"
                  id="subscription"
                >
                  <div className="card-title">
                    <div>
                      <h2>اشتراک کاربر</h2>
                      <span>
                        اطلاعات واقعی دیتابیس
                      </span>
                    </div>

                    <span
                      className={
                        subscriptionActive
                          ? "live"
                          : "offline"
                      }
                    >
                      {subscriptionActive
                        ? "فعال"
                        : "غیرفعال"}
                    </span>
                  </div>

                  {currentSubscription ? (
                    <div className="current-subscription">
                      <div className="subscription-name">
                        <div className="crown">♛</div>

                        <div>
                          <strong>
                            {planName(
                              currentSubscription.plan
                            )}
                          </strong>

                          <span>
                            اشتراک فعلی کاربر
                          </span>
                        </div>
                      </div>

                      <div className="subscription-data">
                        <div>
                          <span>شروع</span>
                          <strong>
                            {formatShortDate(
                              currentSubscription.startsAt
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>انقضا</span>
                          <strong>
                            {formatShortDate(
                              currentSubscription.expiresAt
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>مبلغ</span>
                          <strong>
                            {formatMoney(
                              currentSubscription.price,
                              currentSubscription.currency
                            )}
                          </strong>
                        </div>
                      </div>

                      <form action={cancelSubscription}>
                        <input
                          type="hidden"
                          name="subscriptionId"
                          value={
                            currentSubscription.id
                          }
                        />

                        <input
                          type="hidden"
                          name="userId"
                          value={selectedUser.id}
                        />

                        <button
                          type="submit"
                          className="cancel-button"
                        >
                          لغو تمدید اشتراک
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="no-subscription">
                      <div>◆</div>
                      <strong>
                        اشتراک فعال وجود ندارد
                      </strong>
                      <span>
                        از فرم زیر اشتراک ایجاد یا تمدید کنید.
                      </span>
                    </div>
                  )}

                  <form
                    action={createSubscription}
                    className="subscription-form"
                  >
                    <input
                      type="hidden"
                      name="userId"
                      value={selectedUser.id}
                    />

                    <h3>
                      ایجاد / تمدید اشتراک
                    </h3>

                    <div className="form-row">
                      <select
                        name="plan"
                        defaultValue={
                          selectedUser.plan
                        }
                      >
                        <option value="FREE">
                          Free
                        </option>

                        <option value="VIP">
                          VIP
                        </option>

                        <option value="PREMIUM">
                          Premium
                        </option>

                        <option value="PRO">
                          Pro
                        </option>
                      </select>

                      <input
                        name="days"
                        type="number"
                        min="1"
                        defaultValue="30"
                        placeholder="تعداد روز"
                      />
                    </div>

                    <div className="form-row">
                      <input
                        name="price"
                        type="number"
                        min="0"
                        placeholder="مبلغ"
                      />

                      <input
                        name="currency"
                        defaultValue="تومان"
                        placeholder="واحد پول"
                      />
                    </div>

                    <input
                      name="note"
                      placeholder="یادداشت اشتراک..."
                    />

                    <button
                      type="submit"
                      className="gold-button full"
                    >
                      فعال‌سازی اشتراک
                    </button>
                  </form>
                </section>
              </div>

              <section
                className="card message-card"
                id="message"
              >
                <div className="card-title">
                  <div>
                    <h2>ارسال پیام به کاربر</h2>
                    <span>
                      پیام در اعلان‌های واقعی کاربر ثبت می‌شود.
                    </span>
                  </div>
                </div>

                <form
                  action={sendUserMessage}
                  className="message-form"
                >
                  <input
                    type="hidden"
                    name="userId"
                    value={selectedUser.id}
                  />

                  <input
                    name="title"
                    required
                    placeholder="عنوان پیام"
                  />

                  <textarea
                    name="message"
                    required
                    rows={5}
                    placeholder="متن پیام..."
                  />

                  <button
                    type="submit"
                    className="gold-button"
                  >
                    ارسال پیام
                  </button>
                </form>
              </section>

              <section className="access-grid">
                <div className="access-card card">
                  <div className="access-icon">
                    ↗
                  </div>

                  <div>
                    <strong>
                      کانال سیگنال VIP
                    </strong>

                    <span>
                      مدیریت سیگنال‌ها و اتصال Telegram
                    </span>
                  </div>

                  <Link href="/admin/signals">
                    مدیریت
                    <b>‹</b>
                  </Link>
                </div>

                <div className="access-card card">
                  <div className="access-icon">
                    ◈
                  </div>

                  <div>
                    <strong>
                      دسترسی VPN
                    </strong>

                    <span>
                      مدیریت دسترسی سرویس‌های کاربران
                    </span>
                  </div>

                  <Link href="/admin/settings">
                    تنظیمات
                    <b>‹</b>
                  </Link>
                </div>

                <div className="access-card card">
                  <div className="access-icon">
                    ▣
                  </div>

                  <div>
                    <strong>
                      فعالیت کاربر
                    </strong>

                    <span>
                      {formatNumber(
                        selectedUser._count.trades
                      )}{" "}
                      معامله و{" "}
                      {formatNumber(
                        selectedUser._count.tradingSignals
                      )}{" "}
                      سیگنال
                    </span>
                  </div>

                  <Link href="/admin/reports">
                    گزارش
                    <b>‹</b>
                  </Link>
                </div>
              </section>

              <section
                className="card plan-card"
                id="plan"
              >
                <div>
                  <h2>تغییر پلن کاربر</h2>

                  <p>
                    پلن حساب مستقیماً در دیتابیس تغییر می‌کند.
                  </p>
                </div>

                <form action={changePlan}>
                  <input
                    type="hidden"
                    name="userId"
                    value={selectedUser.id}
                  />

                  <select
                    name="plan"
                    defaultValue={selectedUser.plan}
                  >
                    <option value="FREE">
                      Free
                    </option>

                    <option value="VIP">
                      VIP
                    </option>

                    <option value="PREMIUM">
                      Premium
                    </option>

                    <option value="PRO">
                      Pro
                    </option>
                  </select>

                  <button
                    type="submit"
                    className="gold-button"
                  >
                    ذخیره پلن
                  </button>
                </form>
              </section>
            </section>
          ) : (
            <section className="card no-user">
              <div>♙</div>

              <h2>
                کاربری برای نمایش وجود ندارد
              </h2>

              <p>
                کاربر موردنظر پیدا نشد.
              </p>
            </section>
          )}
        </div>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #050607;
          color: #f5f5f5;
          font-family: Arial, Tahoma, sans-serif;
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        button,
        input,
        select,
        textarea {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        .admin-page {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(
              circle at 80% 0%,
              rgba(214, 166, 72, 0.08),
              transparent 28%
            ),
            radial-gradient(
              circle at 10% 40%,
              rgba(0, 130, 255, 0.045),
              transparent 30%
            ),
            #050607;
        }

        .sidebar {
          width: 250px;
          min-height: 100vh;
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 25px 16px;
          background: rgba(7, 8, 10, 0.95);
          border-left: 1px solid rgba(255,255,255,.06);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          z-index: 10;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 4px 8px 28px;
        }

        .brand-logo {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: linear-gradient(
            145deg,
            #efd078,
            #805b1f
          );
          color: #080705;
          font-size: 22px;
          box-shadow:
            0 10px 30px rgba(218,170,70,.15);
        }

        .brand-text strong {
          display: block;
          font-size: 16px;
        }

        .brand-text span {
          display: block;
          margin-top: 4px;
          color: #73747a;
          font-size: 8px;
          letter-spacing: 1.5px;
        }

        .navigation {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nav-link {
          min-height: 46px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 14px;
          border-radius: 12px;
          color: #85868c;
          border: 1px solid transparent;
          transition: .2s;
          font-size: 12px;
        }

        .nav-link span {
          width: 22px;
          text-align: center;
          font-size: 17px;
        }

        .nav-link:hover,
        .nav-link.active {
          color: #fff;
          background: rgba(218,174,73,.08);
          border-color: rgba(218,174,73,.12);
        }

        .nav-link.active {
          box-shadow: inset -3px 0 #dcb35a;
        }

        .sidebar-footer {
          margin-top: auto;
        }

        .admin-user {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px;
          border-radius: 13px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.055);
        }

        .admin-avatar,
        .mini-avatar {
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: linear-gradient(
            145deg,
            #e8c56c,
            #79571e
          );
          color: #090806;
          font-weight: 800;
        }

        .admin-avatar {
          width: 37px;
          height: 37px;
        }

        .admin-user strong {
          display: block;
          font-size: 11px;
        }

        .admin-user span {
          display: block;
          color: #6f7076;
          font-size: 8px;
          margin-top: 3px;
        }

        .logout-link {
          display: block;
          color: #777980;
          padding: 12px;
          font-size: 11px;
        }

        .main {
          flex: 1;
          min-width: 0;
          padding: 28px 30px 60px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 25px;
        }

        .breadcrumb {
          color: #66686f;
          font-size: 10px;
          margin-bottom: 8px;
        }

        .breadcrumb span {
          color: #cba64e;
          padding: 0 7px;
        }

        .header h1 {
          margin: 0 0 7px;
          font-size: 27px;
        }

        .header p {
          margin: 0;
          color: #6e7076;
          font-size: 11px;
        }

        .header-admin {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .notification-button {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.035);
          color: #bbb;
        }

        .admin-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 13px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.07);
        }

        .mini-avatar {
          width: 33px;
          height: 33px;
          font-size: 12px;
        }

        .admin-chip strong {
          display: block;
          font-size: 10px;
        }

        .admin-chip span {
          display: block;
          color: #6e7076;
          font-size: 8px;
          margin-top: 3px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px;
          margin-bottom: 16px;
        }

        .stat,
        .card,
        .filter-box {
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.055),
              rgba(255,255,255,.018)
            );
          border: 1px solid rgba(255,255,255,.065);
          box-shadow: 0 20px 50px rgba(0,0,0,.15);
          backdrop-filter: blur(20px);
        }

        .stat {
          min-height: 100px;
          border-radius: 17px;
          padding: 17px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon {
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          font-size: 18px;
        }

        .stat-icon.gold {
          color: #e2bc62;
          background: rgba(218,174,73,.1);
        }

        .stat-icon.green {
          color: #52d58e;
          background: rgba(82,213,142,.09);
        }

        .stat-icon.orange {
          color: #e8ad4e;
          background: rgba(232,173,78,.09);
        }

        .stat-icon.red {
          color: #ea7070;
          background: rgba(234,112,112,.09);
        }

        .stat span {
          display: block;
          color: #777980;
          font-size: 10px;
          margin-bottom: 5px;
        }

        .stat strong {
          font-size: 22px;
        }

        .filter-box {
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 17px;
        }

        .filter-form {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search {
          flex: 1;
          min-width: 180px;
          height: 42px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border-radius: 10px;
          background: rgba(0,0,0,.2);
          border: 1px solid rgba(255,255,255,.055);
        }

        .search span {
          color: #73757b;
          font-size: 19px;
        }

        .search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fff;
        }

        input,
        select,
        textarea {
          color: #eee;
          background: #0d0f12;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px;
          outline: none;
        }

        input {
          height: 42px;
          padding: 0 12px;
        }

        select {
          height: 42px;
          padding: 0 11px;
          min-width: 120px;
        }

        textarea {
          padding: 12px;
          resize: vertical;
        }

        input::placeholder,
        textarea::placeholder {
          color: #5f6167;
        }

        .gold-button,
        .clear-button {
          min-height: 42px;
          padding: 0 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          white-space: nowrap;
        }

        .gold-button {
          border: 0;
          color: #0b0906;
          background: linear-gradient(
            135deg,
            #edc96d,
            #a97629
          );
          font-weight: 800;
          box-shadow: 0 10px 25px rgba(211,165,63,.12);
        }

        .gold-button.full {
          width: 100%;
        }

        .clear-button {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          color: #999ba1;
          font-size: 10px;
        }

        .layout {
          display: grid;
          grid-template-columns: 340px minmax(0,1fr);
          gap: 17px;
          align-items: start;
        }

        .card {
          border-radius: 18px;
          overflow: hidden;
        }

        .users-card {
          position: sticky;
          top: 18px;
        }

        .card-title {
          min-height: 65px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .card-title h2 {
          margin: 0 0 4px;
          font-size: 14px;
        }

        .card-title span {
          color: #66686e;
          font-size: 9px;
        }

        .gold-link {
          color: #d9b05a !important;
          font-size: 10px !important;
        }

        .users {
          padding: 8px;
          max-height: 700px;
          overflow-y: auto;
        }

        .user {
          min-height: 62px;
          display: grid;
          grid-template-columns: 40px 1fr auto 12px;
          align-items: center;
          gap: 9px;
          padding: 9px;
          border-radius: 12px;
          border: 1px solid transparent;
          margin-bottom: 4px;
        }

        .user:hover,
        .user.selected {
          background: rgba(218,174,73,.07);
          border-color: rgba(218,174,73,.12);
        }

        .user-avatar {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: linear-gradient(
            145deg,
            #30343a,
            #15171b
          );
          border: 1px solid rgba(255,255,255,.07);
          color: #ddb75e;
          font-weight: 800;
        }

        .user-details {
          min-width: 0;
        }

        .user-details strong {
          display: block;
          font-size: 11px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .user-details span {
          display: block;
          color: #66686e;
          font-size: 8px;
          margin-top: 4px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .user-status {
          text-align: left;
        }

        .plan {
          display: inline-block;
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 8px;
        }

        .plan.VIP {
          color: #e3bd61;
          background: rgba(218,174,73,.1);
        }

        .plan.PREMIUM {
          color: #b99aff;
          background: rgba(145,100,235,.1);
        }

        .plan.PRO {
          color: #65caff;
          background: rgba(72,164,219,.1);
        }

        .plan.FREE {
          color: #999ba0;
          background: rgba(255,255,255,.05);
        }

        .user-status small {
          display: block;
          margin-top: 4px;
          font-size: 7px;
        }

        .active {
          color: #52d28c;
        }

        .blocked {
          color: #e36f6f;
        }

        .arrow {
          color: #5c5e64;
          font-size: 17px;
        }

        .details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .profile {
          padding: 20px;
        }

        .profile-head {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .profile-avatar {
          width: 70px;
          height: 70px;
          flex: 0 0 70px;
          display: grid;
          place-items: center;
          border-radius: 19px;
          background: linear-gradient(
            145deg,
            #e8c56a,
            #805b20
          );
          color: #080705;
          font-size: 27px;
          font-weight: 900;
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .profile-name h2 {
          margin: 0;
          font-size: 20px;
        }

        .profile-info p {
          margin: 7px 0;
          color: #888a90;
          font-size: 11px;
        }

        .success-badge,
        .danger-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 8px;
        }

        .success-badge {
          color: #52d28c;
          background: rgba(82,210,140,.09);
        }

        .danger-badge {
          color: #e87373;
          background: rgba(232,115,115,.09);
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          color: #62646a;
          font-size: 8px;
        }

        .current-plan {
          min-width: 115px;
          padding: 12px;
          text-align: center;
          border-radius: 12px;
          background: rgba(218,174,73,.06);
          border: 1px solid rgba(218,174,73,.1);
        }

        .current-plan span {
          display: block;
          color: #6c6e74;
          font-size: 8px;
          margin-bottom: 5px;
        }

        .current-plan strong {
          color: #e0b95d;
          font-size: 15px;
        }

        .blocked-box {
          margin-top: 15px;
          padding: 11px 13px;
          border-radius: 10px;
          background: rgba(226,83,83,.07);
          border: 1px solid rgba(226,83,83,.12);
          color: #d98585;
          font-size: 10px;
        }

        .blocked-box strong {
          margin-left: 7px;
        }

        .profile-stats {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 8px;
          margin-top: 16px;
        }

        .profile-stats div {
          padding: 11px;
          border-radius: 11px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.045);
        }

        .profile-stats span {
          display: block;
          color: #676970;
          font-size: 8px;
          margin-bottom: 5px;
        }

        .profile-stats strong {
          font-size: 14px;
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 7px;
          margin-top: 12px;
        }

        .action {
          width: 100%;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 8px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          color: #aaa;
          font-size: 9px;
        }

        .action:hover {
          color: #e0ba61;
          border-color: rgba(218,174,73,.2);
        }

        button.action {
          font-size: 9px;
        }

        .action.danger {
          color: #e37878;
        }

        .action.unblock {
          color: #55d591;
        }

        .columns {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 17px;
        }

        .tickets {
          padding: 8px 14px 14px;
        }

        .ticket {
          display: flex;
          gap: 10px;
          padding: 13px 5px;
          border-bottom: 1px solid rgba(255,255,255,.045);
        }

        .ticket:last-child {
          border-bottom: 0;
        }

        .ticket-icon {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: rgba(218,174,73,.08);
          color: #d9b15a;
        }

        .ticket-content {
          flex: 1;
          min-width: 0;
        }

        .ticket-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .ticket-top strong {
          font-size: 10px;
        }

        .ticket-status {
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 7px;
          white-space: nowrap;
        }

        .ticket-open {
          color: #eab354;
          background: rgba(234,179,84,.08);
        }

        .ticket-progress {
          color: #63b8e8;
          background: rgba(99,184,232,.08);
        }

        .ticket-answered {
          color: #54d28d;
          background: rgba(84,210,141,.08);
        }

        .ticket-closed {
          color: #777980;
          background: rgba(255,255,255,.04);
        }

        .ticket-default {
          color: #999;
          background: rgba(255,255,255,.04);
        }

        .ticket-content p {
          margin: 9px 0;
          color: #92949a;
          font-size: 14px;
          line-height: 2;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .ticket-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #5f6167;
          font-size: 8px;
        }

        .status-form {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-form select {
          height: 29px;
          min-width: 100px;
          font-size: 8px;
          padding: 0 5px;
        }

        .status-button {
          height: 29px;
          border-radius: 7px;
          border: 1px solid rgba(218,174,73,.16);
          background: rgba(218,174,73,.07);
          color: #dcb45c;
          padding: 0 8px;
          font-size: 8px;
        }

        .live,
        .offline {
          padding: 5px 8px !important;
          border-radius: 6px;
        }

        .live {
          color: #54d38e !important;
          background: rgba(84,211,142,.08);
        }

        .offline {
          color: #777980 !important;
          background: rgba(255,255,255,.04);
        }

        .current-subscription {
          margin: 13px;
          padding: 14px;
          border-radius: 13px;
          background: rgba(218,174,73,.055);
          border: 1px solid rgba(218,174,73,.1);
        }

        .subscription-name {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .crown {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(218,174,73,.1);
          color: #e1b960;
          font-size: 19px;
        }

        .subscription-name strong {
          display: block;
          color: #e1bb61;
          font-size: 14px;
        }

        .subscription-name span {
          display: block;
          color: #686a70;
          font-size: 8px;
          margin-top: 3px;
        }

        .subscription-data {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 6px;
          margin-top: 13px;
        }

        .subscription-data div {
          padding: 8px;
          border-radius: 8px;
          background: rgba(0,0,0,.13);
        }

        .subscription-data span {
          display: block;
          color: #61636a;
          font-size: 7px;
          margin-bottom: 4px;
        }

        .subscription-data strong {
          font-size: 9px;
        }

        .cancel-button {
          width: 100%;
          height: 34px;
          margin-top: 10px;
          border-radius: 8px;
          border: 1px solid rgba(228,106,106,.15);
          background: rgba(228,106,106,.05);
          color: #dc7d7d;
          font-size: 8px;
        }

        .no-subscription {
          margin: 13px;
          padding: 23px 12px;
          text-align: center;
          border: 1px dashed rgba(255,255,255,.08);
          border-radius: 12px;
        }

        .no-subscription div {
          color: #98782f;
          font-size: 23px;
          margin-bottom: 7px;
        }

        .no-subscription strong {
          display: block;
          font-size: 11px;
        }

        .no-subscription span {
          display: block;
          color: #64666c;
          font-size: 8px;
          margin-top: 5px;
        }

        .subscription-form {
          padding: 0 13px 14px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .subscription-form h3 {
          margin: 2px 0;
          color: #aaa;
          font-size: 10px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .subscription-form input,
        .subscription-form select {
          width: 100%;
        }

        .message-card {
          padding-bottom: 15px;
        }

        .message-form {
          padding: 13px 16px 0;
          display: grid;
          grid-template-columns: 220px 1fr auto;
          gap: 8px;
          align-items: start;
        }

        .message-form textarea {
          min-height: 85px;
        }

        .access-grid {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 11px;
        }

        .access-card {
          padding: 15px;
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 9px;
        }

        .access-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: rgba(218,174,73,.08);
          color: #dcb45c;
          font-size: 17px;
        }

        .access-card strong {
          display: block;
          font-size: 10px;
        }

        .access-card span {
          display: block;
          color: #66686e;
          font-size: 7px;
          line-height: 1.8;
          margin-top: 3px;
        }

        .access-card a {
          grid-column: 1 / -1;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          border-radius: 8px;
          background: rgba(218,174,73,.05);
          color: #d5ae56;
          font-size: 8px;
        }

        .access-card b {
          font-size: 15px;
        }

        .plan-card {
          padding: 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .plan-card h2 {
          margin: 0 0 5px;
          font-size: 13px;
        }

        .plan-card p {
          margin: 0;
          color: #66686e;
          font-size: 8px;
        }

        .plan-card form {
          display: flex;
          gap: 7px;
        }

        .plan-card select {
          min-width: 145px;
        }

        .empty {
          text-align: center;
          padding: 42px 15px;
        }

        .empty div,
        .no-user > div {
          color: #aa8538;
          font-size: 27px;
          margin-bottom: 9px;
        }

        .empty strong,
        .no-user h2 {
          display: block;
          color: #b7b8bd;
          font-size: 12px;
        }

        .empty span,
        .no-user p {
          display: block;
          color: #606268;
          font-size: 8px;
          margin-top: 5px;
        }

        .empty.compact {
          padding: 27px 10px;
        }

        .no-user {
          min-height: 300px;
          display: grid;
          place-items: center;
          align-content: center;
          text-align: center;
        }

        @media (max-width: 1250px) {
          .layout {
            grid-template-columns: 300px minmax(0,1fr);
          }

          .stats {
            grid-template-columns: repeat(2,1fr);
          }

          .actions {
            grid-template-columns: repeat(2,1fr);
          }

          .message-form {
            grid-template-columns: 1fr 1fr;
          }

          .message-form textarea {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 1000px) {
          .sidebar {
            width: 72px;
            padding: 17px 9px;
          }

          .brand {
            justify-content: center;
          }

          .brand-text,
          .nav-link b,
          .admin-user > div:last-child,
          .logout-link {
            display: none;
          }

          .nav-link {
            justify-content: center;
            padding: 0;
          }

          .nav-link span {
            font-size: 18px;
          }

          .admin-user {
            justify-content: center;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .users-card {
            position: static;
          }

          .users {
            max-height: 330px;
          }

          .columns {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .main {
            padding: 18px 12px 45px;
          }

          .header {
            flex-direction: column;
          }

          .header-admin {
            width: 100%;
          }

          .admin-chip {
            margin-right: auto;
          }

          .filter-form {
            flex-wrap: wrap;
          }

          .search {
            flex-basis: 100%;
          }

          .profile-head {
            flex-wrap: wrap;
          }

          .current-plan {
            width: 100%;
          }

          .profile-stats {
            grid-template-columns: 1fr 1fr;
          }

          .access-grid {
            grid-template-columns: 1fr;
          }

          .message-form {
            grid-template-columns: 1fr;
          }

          .message-form textarea {
            grid-column: auto;
          }

          .plan-card {
            flex-direction: column;
            align-items: stretch;
          }

          .plan-card form {
            flex-direction: column;
          }
        }

        @media (max-width: 500px) {
          .sidebar {
            display: none;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .header h1 {
            font-size: 23px;
          }

          .actions {
            grid-template-columns: 1fr;
          }

          .subscription-data {
            grid-template-columns: 1fr;
          }

          .ticket-top {
            align-items: flex-start;
            flex-direction: column;
          }

          .ticket-bottom {
            align-items: flex-start;
            flex-direction: column;
          }

          .status-form {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
