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

const plans = ["FREE", "VIP", "PREMIUM", "PRO"];

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function money(value: number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined) return "—";

  return `${new Intl.NumberFormat("fa-IR").format(value)} ${
    currency || "تومان"
  }`;
}

function dateFa(value: Date | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function shortDate(value: Date | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function planLabel(plan: string | null | undefined) {
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

function ticketLabel(status: string) {
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

function ticketClass(status: string) {
  switch (status) {
    case "OPEN":
      return "status-open";
    case "IN_PROGRESS":
      return "status-progress";
    case "ANSWERED":
      return "status-answered";
    case "CLOSED":
      return "status-closed";
    default:
      return "status-default";
  }
}

async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
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

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}

async function blockUser(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const userId = text(formData.get("userId"));
  const reason = text(formData.get("reason")) || "مسدود شده توسط مدیر";

  if (!userId) {
    redirect("/admin/users");
  }

  if (userId === admin.id) {
    redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
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

  await prisma.session.deleteMany({
    where: {
      userId,
    },
  });

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

  const userId = text(formData.get("userId"));

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

  const userId = text(formData.get("userId"));
  const plan = text(formData.get("plan"));

  if (!userId || !plans.includes(plan)) {
    redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
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
      message: `پلن حساب شما به ${planLabel(plan)} تغییر کرد.`,
      dedupeKey: `plan-changed-${userId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function createSubscription(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = text(formData.get("userId"));
  const plan = text(formData.get("plan"));
  const daysRaw = text(formData.get("days"));
  const priceRaw = text(formData.get("price"));
  const currency = text(formData.get("currency")) || "تومان";
  const note = text(formData.get("note"));

  if (!userId || !plans.includes(plan)) {
    redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
  }

  const days = Math.max(1, Number(daysRaw || 30));
  const parsedPrice = priceRaw ? Number(priceRaw) : null;

  const price =
    parsedPrice !== null && Number.isFinite(parsedPrice)
      ? parsedPrice
      : null;

  const now = new Date();

  const activeSubscription = await prisma.userSubscription.findFirst({
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
      message: `اشتراک ${planLabel(
        plan
      )} برای شما فعال شد و تا ${dateFa(expiresAt)} اعتبار دارد.`,
      dedupeKey: `subscription-created-${userId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function cancelSubscription(formData: FormData) {
  "use server";

  await requireAdmin();

  const subscriptionId = text(formData.get("subscriptionId"));
  const userId = text(formData.get("userId"));

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
      title: "اشتراک لغو شد",
      message:
        "تمدید خودکار اشتراک شما توسط مدیریت لغو شد. در صورت داشتن زمان باقی‌مانده، دسترسی تا تاریخ انقضا ادامه دارد.",
      dedupeKey: `subscription-cancelled-${subscriptionId}-${Date.now()}`,
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function sendUserMessage(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = text(formData.get("userId"));
  const title = text(formData.get("title"));
  const message = text(formData.get("message"));

  if (!userId || !title || !message) {
    redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
  }

  await prisma.userNotification.create({
    data: {
      userId,
      type: "ADMIN_MESSAGE",
      title,
      message,
      dedupeKey: crypto.randomUUID(),
    },
  });

  revalidatePath("/admin/users");

  redirect(`/admin/users?user=${encodeURIComponent(userId)}`);
}

async function changeTicketStatus(formData: FormData) {
  "use server";

  await requireAdmin();

  const ticketId = text(formData.get("ticketId"));
  const userId = text(formData.get("userId"));
  const status = text(formData.get("status"));

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

export default async function AdminUsersPage({
  searchParams,
}: PageProps) {
  const admin = await requireAdmin();

  const params = await searchParams;

  const q = params?.q?.trim() || "";
  const planFilter = params?.plan || "";
  const statusFilter = params?.status || "";
  const requestedUserId = params?.user || "";

  const now = new Date();

  const where: {
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
    }>;
    plan?: string;
    isBlocked?: boolean;
  } = {};

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
    requestedUserId && users.some((user) => user.id === requestedUserId)
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
      subscription.status === "ACTIVE" && subscription.expiresAt > now
  );

  const subscriptionIsActive =
    !!currentSubscription && currentSubscription.expiresAt > now;

  return (
    <>
      <div className="admin-page" dir="rtl">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-logo">
              <span>✦</span>
            </div>

            <div>
              <strong>Trading AI</strong>
              <small>ADMIN PANEL</small>
            </div>
          </div>

          <nav className="nav">
            <Link href="/admin" className="nav-item">
              <span>⌂</span>
              داشبورد
            </Link>

            <Link href="/admin/users" className="nav-item active">
              <span>♙</span>
              کاربران
            </Link>

            <Link href="/admin/support" className="nav-item">
              <span>◉</span>
              پشتیبانی
            </Link>

            <Link href="/admin/subscriptions" className="nav-item">
              <span>◆</span>
              اشتراک‌ها
            </Link>

            <Link href="/admin/signals" className="nav-item">
              <span>↗</span>
              کانال سیگنال VIP
            </Link>

            <Link href="/admin/settings" className="nav-item">
              <span>⚙</span>
              تنظیمات
            </Link>

            <Link href="/admin/reports" className="nav-item">
              <span>▦</span>
              گزارش‌ها
            </Link>
          </nav>

          <div className="sidebar-bottom">
            <div className="admin-mini">
              <div className="admin-avatar">
                {(admin.name || "A").slice(0, 1)}
              </div>

              <div>
                <strong>{admin.name}</strong>
                <small>مدیر سیستم</small>
              </div>
            </div>

            <Link href="/logout" className="logout">
              <span>⇥</span>
              خروج
            </Link>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <div className="breadcrumb">
                پنل مدیریت
                <span>›</span>
                کاربران
              </div>

              <h1>مدیریت کاربران</h1>

              <p>
                مدیریت حساب‌ها، اشتراک‌ها، پشتیبانی و وضعیت دسترسی کاربران
              </p>
            </div>

            <div className="top-actions">
              <button className="icon-button" type="button">
                🔔
              </button>

              <div className="admin-pill">
                <div className="avatar-small">
                  {(admin.name || "A").slice(0, 1)}
                </div>

                <div>
                  <strong>{admin.name}</strong>
                  <span>Administrator</span>
                </div>
              </div>
            </div>
          </header>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">♙</div>
              <div>
                <span>کاربران کل</span>
                <strong>{totalUsers.toLocaleString("fa-IR")}</strong>
              </div>
              <small>ثبت‌نام شده</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">✓</div>
              <div>
                <span>اشتراک فعال</span>
                <strong>
                  {activeSubscriptions.toLocaleString("fa-IR")}
                </strong>
              </div>
              <small>در حال استفاده</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">◉</div>
              <div>
                <span>درخواست پشتیبانی</span>
                <strong>{openTickets.toLocaleString("fa-IR")}</strong>
              </div>
              <small>باز و در حال بررسی</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon red">!</div>
              <div>
                <span>کاربران مسدود</span>
                <strong>{blockedUsers.toLocaleString("fa-IR")}</strong>
              </div>
              <small>حساب‌های محدود شده</small>
            </div>
          </section>

          <section className="filter-card">
            <form method="get" className="filter-form">
              {selectedId && (
                <input type="hidden" name="user" value={selectedId} />
              )}

              <div className="search-box">
                <span>⌕</span>

                <input
                  name="q"
                  defaultValue={q}
                  placeholder="جستجو با نام یا ایمیل کاربر..."
                />
              </div>

              <select name="plan" defaultValue={planFilter}>
                <option value="">همه پلن‌ها</option>
                <option value="FREE">Free</option>
                <option value="VIP">VIP</option>
                <option value="PREMIUM">Premium</option>
                <option value="PRO">Pro</option>
              </select>

              <select name="status" defaultValue={statusFilter}>
                <option value="">همه وضعیت‌ها</option>
                <option value="ACTIVE">فعال</option>
                <option value="BLOCKED">مسدود</option>
              </select>

              <button className="gold-button" type="submit">
                جستجو
              </button>

              <Link href="/admin/users" className="reset-button">
                پاک کردن
              </Link>
            </form>
          </section>

          <div className="content-grid">
            <section className="users-panel glass-card">
              <div className="section-header">
                <div>
                  <h2>لیست کاربران</h2>
                  <span>{users.length.toLocaleString("fa-IR")} نتیجه</span>
                </div>
              </div>

              <div className="user-list">
                {users.length === 0 ? (
                  <div className="empty">
                    <div>⌕</div>
                    <strong>کاربری پیدا نشد</strong>
                    <span>عبارت جستجو یا فیلتر را تغییر دهید.</span>
                  </div>
                ) : (
                  users.map((user) => (
                    <Link
                      key={user.id}
                      href={`/admin/users?user=${encodeURIComponent(
                        user.id
                      )}`}
                      className={`user-row ${
                        user.id === selectedId ? "selected" : ""
                      }`}
                    >
                      <div className="user-avatar">
                        {(user.name || "U").slice(0, 1)}
                      </div>

                      <div className="user-info">
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </div>

                      <div className="user-plan">
                        <span className={`plan plan-${user.plan}`}>
                          {planLabel(user.plan)}
                        </span>

                        {user.isBlocked ? (
                          <small className="blocked-text">مسدود</small>
                        ) : (
                          <small className="active-text">فعال</small>
                        )}
                      </div>

                      <div className="user-arrow">‹</div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {selectedUser ? (
              <section className="details-area">
                <div className="profile-card glass-card">
                  <div className="profile-top">
                    <div className="profile-avatar">
                      {(selectedUser.name || "U").slice(0, 1)}
                    </div>

                    <div className="profile-main">
                      <div className="profile-name-line">
                        <h2>{selectedUser.name}</h2>

                        {selectedUser.isBlocked ? (
                          <span className="danger-badge">مسدود</span>
                        ) : (
                          <span className="success-badge">فعال</span>
                        )}
                      </div>

                      <p>{selectedUser.email}</p>

                      <div className="profile-meta">
                        <span>
                          عضویت: {shortDate(selectedUser.createdAt)}
                        </span>

                        <span>
                          آخرین بروزرسانی:{" "}
                          {dateFa(selectedUser.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="profile-plan">
                      <span>پلن فعلی</span>
                      <strong>{planLabel(selectedUser.plan)}</strong>
                    </div>
                  </div>

                  {selectedUser.isBlocked &&
                    selectedUser.blockedReason && (
                      <div className="blocked-notice">
                        <strong>علت مسدودی:</strong>
                        <span>{selectedUser.blockedReason}</span>
                      </div>
                    )}

                  <div className="quick-stats">
                    <div>
                      <span>ربات‌ها</span>
                      <strong>
                        {selectedUser._count.tradingBots.toLocaleString(
                          "fa-IR"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>سیگنال‌ها</span>
                      <strong>
                        {selectedUser._count.tradingSignals.toLocaleString(
                          "fa-IR"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>معاملات</span>
                      <strong>
                        {selectedUser._count.trades.toLocaleString("fa-IR")}
                      </strong>
                    </div>

                    <div>
                      <span>تیکت‌ها</span>
                      <strong>
                        {selectedUser._count.supportTickets.toLocaleString(
                          "fa-IR"
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="action-grid">
                    <a href="#message-user" className="action-button">
                      <span>✉</span>
                      پیام به کاربر
                    </a>

                    <a href="#subscription" className="action-button">
                      <span>◆</span>
                      مدیریت اشتراک
                    </a>

                    <a href="#change-plan" className="action-button">
                      <span>✎</span>
                      تغییر پلن
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
                          className="action-button unblock"
                        >
                          <span>✓</span>
                          فعال کردن حساب
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
                          className="action-button danger"
                        >
                          <span>⊘</span>
                          مسدود کردن حساب
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="two-column">
                  <section className="glass-card support-card">
                    <div className="section-header">
                      <div>
                        <h2>درخواست‌های پشتیبانی</h2>
                        <span>
                          {selectedUser.supportTickets.length.toLocaleString(
                            "fa-IR"
                          )}{" "}
                          درخواست
                        </span>
                      </div>

                      <Link href="/admin/support" className="view-all">
                        مشاهده همه
                      </Link>
                    </div>

                    <div className="ticket-list">
                      {selectedUser.supportTickets.length === 0 ? (
                        <div className="empty compact">
                          <div>✓</div>
                          <strong>درخواستی ثبت نشده</strong>
                          <span>این کاربر هنوز تیکتی ندارد.</span>
                        </div>
                      ) : (
                        selectedUser.supportTickets.map((ticket) => {
                          const lastMessage = ticket.messages[0];

                          return (
                            <div className="ticket" key={ticket.id}>
                              <div className="ticket-icon">✉</div>

                              <div className="ticket-body">
                                <div className="ticket-title">
                                  <strong>{ticket.subject}</strong>

                                  <span
                                    className={`ticket-status ${ticketClass(
                                      ticket.status
                                    )}`}
                                  >
                                    {ticketLabel(ticket.status)}
                                  </span>
                                </div>

                                <p>
                                  {lastMessage?.message ||
                                    "هنوز پیامی ثبت نشده است."}
                                </p>

                                <div className="ticket-footer">
                                  <span>
                                    آخرین پیام:{" "}
                                    {dateFa(
                                      lastMessage?.createdAt ||
                                        ticket.updatedAt
                                    )}
                                  </span>

                                  <form action={changeTicketStatus}>
                                    <input
                                      type="hidden"
                                      name="ticketId"
                                      value={ticket.id}
                                    />

                                    <input
                                      type="hidden"
                                      name="userId"
                                      value={selectedUser.id}
                                    />

                                    <select
                                      name="status"
                                      defaultValue={ticket.status}
                                      onChange={(event) => {
                                        event.currentTarget.form?.requestSubmit();
                                      }}
                                    >
                                      <option value="OPEN">باز</option>
                                      <option value="IN_PROGRESS">
                                        در حال بررسی
                                      </option>
                                      <option value="ANSWERED">
                                        پاسخ داده شده
                                      </option>
                                      <option value="CLOSED">بسته</option>
                                    </select>
                                  </form>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section
                    className="glass-card subscription-card"
                    id="subscription"
                  >
                    <div className="section-header">
                      <div>
                        <h2>اشتراک کاربر</h2>
                        <span>اطلاعات واقعی از دیتابیس</span>
                      </div>

                      <span
                        className={
                          subscriptionIsActive
                            ? "subscription-live"
                            : "subscription-off"
                        }
                      >
                        {subscriptionIsActive ? "فعال" : "غیرفعال"}
                      </span>
                    </div>

                    {currentSubscription ? (
                      <div className="current-subscription">
                        <div className="subscription-header">
                          <div className="crown">♛</div>

                          <div>
                            <strong>
                              {planLabel(currentSubscription.plan)}
                            </strong>
                            <span>اشتراک فعلی</span>
                          </div>
                        </div>

                        <div className="subscription-details">
                          <div>
                            <span>شروع</span>
                            <strong>
                              {shortDate(currentSubscription.startsAt)}
                            </strong>
                          </div>

                          <div>
                            <span>انقضا</span>
                            <strong>
                              {shortDate(currentSubscription.expiresAt)}
                            </strong>
                          </div>

                          <div>
                            <span>مبلغ</span>
                            <strong>
                              {money(
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
                            value={currentSubscription.id}
                          />

                          <input
                            type="hidden"
                            name="userId"
                            value={selectedUser.id}
                          />

                          <button type="submit" className="cancel-button">
                            لغو تمدید این اشتراک
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="no-subscription">
                        <div>◆</div>
                        <strong>اشتراک فعال ندارد</strong>
                        <span>
                          می‌توانید از فرم پایین یک اشتراک واقعی ثبت کنید.
                        </span>
                      </div>
                    )}

                    <form className="subscription-form" action={createSubscription}>
                      <input
                        type="hidden"
                        name="userId"
                        value={selectedUser.id}
                      />

                      <div className="form-title">ایجاد / تمدید اشتراک</div>

                      <div className="form-row">
                        <select name="plan" defaultValue={selectedUser.plan}>
                          <option value="FREE">Free</option>
                          <option value="VIP">VIP</option>
                          <option value="PREMIUM">Premium</option>
                          <option value="PRO">Pro</option>
                        </select>

                        <input
                          name="days"
                          type="number"
                          min="1"
                          defaultValue="30"
                          placeholder="روز"
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

                      <button className="gold-button full" type="submit">
                        فعال‌سازی اشتراک
                      </button>
                    </form>
                  </section>
                </div>

                <section
                  className="glass-card message-card"
                  id="message-user"
                >
                  <div className="section-header">
                    <div>
                      <h2>ارسال پیام به کاربر</h2>
                      <span>
                        پیام در جدول اعلان‌های واقعی کاربر ثبت می‌شود.
                      </span>
                    </div>
                  </div>

                  <form action={sendUserMessage} className="message-form">
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
                      placeholder="متن پیام را بنویسید..."
                    />

                    <button className="gold-button" type="submit">
                      ارسال پیام
                    </button>
                  </form>
                </section>

                <section className="access-grid">
                  <div className="access-card glass-card">
                    <div className="access-icon">↗</div>

                    <div>
                      <strong>کانال سیگنال VIP</strong>
                      <span>
                        مدیریت ارسال سیگنال‌ها و اتصال Telegram
                      </span>
                    </div>

                    <Link href="/admin/signals">
                      مدیریت
                      <b>‹</b>
                    </Link>
                  </div>

                  <div className="access-card glass-card">
                    <div className="access-icon">◈</div>

                    <div>
                      <strong>دسترسی VPN</strong>
                      <span>
                        بخش مدیریت دسترسی کاربران به سرویس‌ها
                      </span>
                    </div>

                    <Link href="/admin/settings">
                      تنظیمات
                      <b>‹</b>
                    </Link>
                  </div>

                  <div className="access-card glass-card">
                    <div className="access-icon">▣</div>

                    <div>
                      <strong>گزارش فعالیت</strong>
                      <span>
                        {selectedUser._count.trades.toLocaleString(
                          "fa-IR"
                        )}{" "}
                        معامله و{" "}
                        {selectedUser._count.tradingSignals.toLocaleString(
                          "fa-IR"
                        )}{" "}
                        سیگنال
                      </span>
                    </div>

                    <Link href="/admin/reports">
                      مشاهده
                      <b>‹</b>
                    </Link>
                  </div>
                </section>

                <section
                  className="glass-card plan-card"
                  id="change-plan"
                >
                  <div>
                    <h2>تغییر پلن کاربر</h2>
                    <p>
                      تغییر مستقیم پلن در حساب کاربر ثبت می‌شود.
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
                      <option value="FREE">Free</option>
                      <option value="VIP">VIP</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="PRO">Pro</option>
                    </select>

                    <button className="gold-button" type="submit">
                      ذخیره پلن
                    </button>
                  </form>
                </section>
              </section>
            ) : (
              <section className="glass-card no-user">
                <div>♙</div>
                <h2>کاربری برای نمایش وجود ندارد</h2>
                <p>ابتدا یک کاربر انتخاب کنید.</p>
              </section>
            )}
          </div>
        </main>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #050608;
          color: #f5f5f5;
          font-family: Arial, Tahoma, sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        input,
        select,
        textarea {
          font: inherit;
        }

        .admin-page {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(circle at 80% 0%, rgba(214, 166, 72, .08), transparent 28%),
            radial-gradient(circle at 10% 30%, rgba(35, 104, 255, .06), transparent 30%),
            #050608;
        }

        .sidebar {
          width: 255px;
          min-height: 100vh;
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 28px 18px;
          border-left: 1px solid rgba(255,255,255,.07);
          background: rgba(8, 9, 12, .92);
          backdrop-filter: blur(25px);
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 8px 28px;
        }

        .brand-logo {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #e9c36a, #76551b);
          color: #050608;
          font-size: 23px;
          box-shadow: 0 10px 35px rgba(218,170,70,.2);
        }

        .brand strong {
          display: block;
          font-size: 17px;
        }

        .brand small {
          color: #8e8e95;
          font-size: 9px;
          letter-spacing: 1.5px;
          margin-top: 4px;
          display: block;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .nav-item {
          min-height: 47px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 0 15px;
          color: #92939a;
          border-radius: 13px;
          transition: .2s;
          font-size: 14px;
        }

        .nav-item span {
          width: 22px;
          text-align: center;
          font-size: 17px;
        }

        .nav-item:hover,
        .nav-item.active {
          color: #fff;
          background: linear-gradient(
            90deg,
            rgba(217,168,68,.17),
            rgba(217,168,68,.05)
          );
          border: 1px solid rgba(218,174,77,.14);
        }

        .nav-item.active {
          box-shadow: inset -3px 0 0 #d8ae55;
        }

        .sidebar-bottom {
          margin-top: auto;
        }

        .admin-mini {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: 15px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.06);
          margin-bottom: 10px;
        }

        .admin-avatar,
        .avatar-small {
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: linear-gradient(145deg, #e7c267, #86611e);
          color: #080808;
          font-weight: 800;
        }

        .admin-avatar {
          width: 38px;
          height: 38px;
        }

        .admin-mini strong {
          display: block;
          font-size: 12px;
        }

        .admin-mini small {
          display: block;
          color: #85858b;
          margin-top: 4px;
          font-size: 10px;
        }

        .logout {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #8b8c91;
          padding: 12px 15px;
          font-size: 13px;
        }

        .main {
          flex: 1;
          min-width: 0;
          padding: 28px 30px 60px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 28px;
        }

        .breadcrumb {
          color: #777981;
          font-size: 12px;
          margin-bottom: 9px;
        }

        .breadcrumb span {
          padding: 0 8px;
          color: #c7a052;
        }

        h1 {
          font-size: 28px;
          margin: 0 0 8px;
        }

        .topbar p {
          margin: 0;
          color: #777980;
          font-size: 13px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon-button {
          width: 43px;
          height: 43px;
          border-radius: 13px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          color: #ddd;
          cursor: pointer;
        }

        .admin-pill {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 11px;
          border-radius: 14px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.07);
        }

        .avatar-small {
          width: 33px;
          height: 33px;
          font-size: 13px;
        }

        .admin-pill strong {
          display: block;
          font-size: 11px;
        }

        .admin-pill span {
          display: block;
          color: #777980;
          font-size: 9px;
          margin-top: 3px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .stat-card,
        .glass-card,
        .filter-card {
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.055),
              rgba(255,255,255,.018)
            );
          border: 1px solid rgba(255,255,255,.075);
          box-shadow: 0 20px 50px rgba(0,0,0,.16);
          backdrop-filter: blur(22px);
        }

        .stat-card {
          min-height: 112px;
          border-radius: 19px;
          padding: 18px;
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 11px;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .stat-card > small {
          position: absolute;
          left: 18px;
          bottom: 12px;
          color: #66686e;
          font-size: 9px;
        }

        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          font-size: 19px;
        }

        .purple {
          background: rgba(144,94,255,.13);
          color: #b795ff;
        }

        .green {
          background: rgba(62,205,135,.11);
          color: #56d99a;
        }

        .orange {
          background: rgba(235,164,62,.12);
          color: #e9ae53;
        }

        .red {
          background: rgba(235,77,77,.11);
          color: #ef7373;
        }

        .stat-card span {
          display: block;
          color: #85868d;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .stat-card strong {
          display: block;
          font-size: 23px;
        }

        .filter-card {
          border-radius: 18px;
          padding: 13px;
          margin-bottom: 18px;
        }

        .filter-form {
          display: flex;
          gap: 9px;
          align-items: center;
        }

        .search-box {
          flex: 1;
          min-width: 180px;
          height: 43px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 13px;
          border-radius: 11px;
          background: rgba(0,0,0,.22);
          border: 1px solid rgba(255,255,255,.06);
        }

        .search-box span {
          color: #85868b;
          font-size: 20px;
        }

        .search-box input {
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          min-width: 0;
        }

        select,
        input,
        textarea {
          background: #0d0f13;
          border: 1px solid rgba(255,255,255,.08);
          color: #eee;
          border-radius: 11px;
          outline: none;
        }

        select {
          height: 43px;
          padding: 0 12px;
          min-width: 125px;
        }

        input {
          height: 43px;
          padding: 0 13px;
        }

        textarea {
          padding: 13px;
          resize: vertical;
        }

        input::placeholder,
        textarea::placeholder {
          color: #666970;
        }

        .gold-button,
        .reset-button {
          min-height: 43px;
          border-radius: 11px;
          padding: 0 18px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          border: 0;
          white-space: nowrap;
        }

        .gold-button {
          background: linear-gradient(135deg, #ebc66c, #a87527);
          color: #0b0a08;
          font-weight: 800;
          box-shadow: 0 9px 25px rgba(209,161,61,.14);
        }

        .gold-button.full {
          width: 100%;
        }

        .reset-button {
          border: 1px solid rgba(255,255,255,.08);
          color: #aaa;
          background: rgba(255,255,255,.025);
        }

        .content-grid {
          display: grid;
          grid-template-columns: 350px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .glass-card {
          border-radius: 19px;
          overflow: hidden;
        }

        .users-panel {
          position: sticky;
          top: 20px;
        }

        .section-header {
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .section-header h2 {
          margin: 0 0 5px;
          font-size: 15px;
        }

        .section-header span {
          color: #707178;
          font-size: 10px;
        }

        .view-all {
          color: #d8af57;
          font-size: 11px;
        }

        .user-list {
          padding: 8px;
          max-height: 720px;
          overflow-y: auto;
        }

        .user-row {
          display: grid;
          grid-template-columns: 41px 1fr auto 15px;
          gap: 9px;
          align-items: center;
          padding: 11px 10px;
          border-radius: 14px;
          border: 1px solid transparent;
          margin-bottom: 5px;
        }

        .user-row:hover,
        .user-row.selected {
          background: rgba(218,174,82,.075);
          border-color: rgba(218,174,82,.13);
        }

        .user-avatar {
          width: 39px;
          height: 39px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg,#30343b,#15171c);
          border: 1px solid rgba(255,255,255,.08);
          color: #d9b65f;
          font-weight: 800;
        }

        .user-info {
          min-width: 0;
        }

        .user-info strong {
          display: block;
          font-size: 12px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .user-info span {
          display: block;
          color: #6e7077;
          font-size: 9px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          margin-top: 4px;
        }

        .user-plan {
          text-align: left;
        }

        .plan {
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 8px;
          border: 1px solid rgba(255,255,255,.07);
        }

        .plan-VIP {
          color: #e7c46b;
          background: rgba(221,174,69,.1);
        }

        .plan-PREMIUM {
          color: #b998ff;
          background: rgba(143,99,232,.1);
        }

        .plan-PRO {
          color: #62c9ff;
          background: rgba(74,164,220,.1);
        }

        .plan-FREE {
          color: #96979d;
          background: rgba(255,255,255,.05);
        }

        .user-plan small {
          display: block;
          margin-top: 4px;
          font-size: 8px;
        }

        .active-text {
          color: #53d491;
        }

        .blocked-text {
          color: #e86b6b;
        }

        .user-arrow {
          color: #66676c;
          font-size: 18px;
        }

        .details-area {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .profile-card {
          padding: 22px;
        }

        .profile-top {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .profile-avatar {
          width: 72px;
          height: 72px;
          flex: 0 0 72px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(145deg,#e6c066,#805c20);
          color: #080706;
          font-size: 28px;
          font-weight: 900;
          box-shadow: 0 15px 35px rgba(219,170,65,.15);
        }

        .profile-main {
          flex: 1;
          min-width: 0;
        }

        .profile-name-line {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .profile-main h2 {
          margin: 0;
          font-size: 21px;
        }

        .profile-main p {
          color: #888990;
          margin: 7px 0;
          font-size: 12px;
        }

        .profile-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          color: #64666d;
          font-size: 9px;
        }

        .success-badge,
        .danger-badge {
          padding: 4px 8px;
          border-radius: 7px;
          font-size: 9px;
        }

        .success-badge {
          color: #55d493;
          background: rgba(60,202,129,.1);
        }

        .danger-badge {
          color: #f07777;
          background: rgba(232,76,76,.1);
        }

        .profile-plan {
          min-width: 125px;
          text-align: center;
          padding: 13px;
          border-radius: 14px;
          background: rgba(218,174,77,.06);
          border: 1px solid rgba(218,174,77,.1);
        }

        .profile-plan span {
          display: block;
          color: #76777e;
          font-size: 9px;
          margin-bottom: 7px;
        }

        .profile-plan strong {
          color: #e2bd65;
          font-size: 17px;
        }

        .blocked-notice {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          padding: 11px 13px;
          border-radius: 11px;
          background: rgba(230,76,76,.07);
          border: 1px solid rgba(230,76,76,.13);
          color: #db8585;
          font-size: 11px;
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 18px;
        }

        .quick-stats > div {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.05);
        }

        .quick-stats span {
          display: block;
          color: #707178;
          font-size: 9px;
          margin-bottom: 5px;
        }

        .quick-stats strong {
          font-size: 15px;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .action-button {
          min-height: 43px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
          color: #bdbec3;
          cursor: pointer;
          font-size: 10px;
        }

        .action-button:hover {
          border-color: rgba(220,174,70,.25);
          color: #e7c36b;
        }

        .action-button.danger {
          color: #e77a7a;
        }

        .action-button.unblock {
          color: #5bd493;
        }

        .two-column {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 18px;
        }

        .ticket-list {
          padding: 10px 14px 14px;
        }

        .ticket {
          display: flex;
          gap: 11px;
          padding: 13px 6px;
          border-bottom: 1px solid rgba(255,255,255,.05);
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
          border-radius: 10px;
          background: rgba(218,174,75,.08);
          color: #dcb45d;
        }

        .ticket-body {
          min-width: 0;
          flex: 1;
        }

        .ticket-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .ticket-title strong {
          font-size: 11px;
        }

        .ticket-status {
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 8px;
          white-space: nowrap;
        }

        .status-open {
          color: #f0bb59;
          background: rgba(240,187,89,.09);
        }

        .status-progress {
          color: #61b8e8;
          background: rgba(97,184,232,.09);
        }

        .status-answered {
          color: #59d694;
          background: rgba(89,214,148,.09);
        }

        .status-closed {
          color: #777980;
          background: rgba(255,255,255,.05);
        }

        .status-default {
          color: #aaa;
          background: rgba(255,255,255,.05);
        }

        .ticket-body p {
          color: #85868d;
          font-size: 15px;
          line-height: 2;
          margin: 9px 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .ticket-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          color: #62646a;
          font-size: 8px;
        }

        .ticket-footer select {
          height: 30px;
          min-width: 105px;
          font-size: 9px;
          padding: 0 7px;
        }

        .subscription-card {
          padding-bottom: 16px;
        }

        .subscription-live,
        .subscription-off {
          padding: 5px 9px;
          border-radius: 7px;
          font-size: 9px;
        }

        .subscription-live {
          color: #55d493;
          background: rgba(85,212,147,.08);
        }

        .subscription-off {
          color: #888a90;
          background: rgba(255,255,255,.05);
        }

        .current-subscription {
          margin: 14px;
          padding: 15px;
          border-radius: 14px;
          background:
            linear-gradient(
              145deg,
              rgba(217,174,72,.09),
              rgba(255,255,255,.025)
            );
          border: 1px solid rgba(217,174,72,.12);
        }

        .subscription-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .crown {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: rgba(218,174,72,.12);
          color: #e4bd62;
          font-size: 20px;
        }

        .subscription-header strong {
          display: block;
          color: #e3bd62;
          font-size: 15px;
        }

        .subscription-header span {
          display: block;
          color: #707177;
          font-size: 9px;
          margin-top: 3px;
        }

        .subscription-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          margin-top: 14px;
        }

        .subscription-details div {
          padding: 9px;
          border-radius: 9px;
          background: rgba(0,0,0,.15);
        }

        .subscription-details span {
          display: block;
          color: #65676d;
          font-size: 8px;
          margin-bottom: 4px;
        }

        .subscription-details strong {
          font-size: 10px;
        }

        .cancel-button {
          width: 100%;
          margin-top: 11px;
          height: 35px;
          border-radius: 9px;
          border: 1px solid rgba(231,105,105,.16);
          color: #df8585;
          background: rgba(231,105,105,.05);
          cursor: pointer;
          font-size: 9px;
        }

        .subscription-form {
          padding: 0 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-title {
          color: #bbbcc1;
          font-size: 10px;
          margin: 4px 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .subscription-form input,
        .subscription-form select {
          width: 100%;
        }

        .no-subscription {
          margin: 14px;
          padding: 25px;
          border: 1px dashed rgba(255,255,255,.09);
          border-radius: 14px;
          text-align: center;
        }

        .no-subscription div {
          font-size: 23px;
          color: #777;
          margin-bottom: 8px;
        }

        .no-subscription strong {
          display: block;
          font-size: 12px;
        }

        .no-subscription span {
          display: block;
          color: #686a70;
          font-size: 9px;
          margin-top: 6px;
        }

        .message-card {
          padding-bottom: 18px;
        }

        .message-form {
          padding: 15px 18px 0;
          display: grid;
          grid-template-columns: 220px 1fr auto;
          gap: 9px;
          align-items: start;
        }

        .message-form textarea {
          min-height: 86px;
        }

        .access-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .access-card {
          padding: 16px;
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 10px;
          align-items: center;
        }

        .access-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(216,174,79,.08);
          color: #dcb65f;
          font-size: 18px;
        }

        .access-card strong {
          display: block;
          font-size: 11px;
        }

        .access-card span {
          display: block;
          color: #6e7076;
          font-size: 8px;
          line-height: 1.7;
          margin-top: 3px;
        }

        .access-card a {
          grid-column: 1 / -1;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 9px;
          border-radius: 8px;
          color: #cda94f;
          background: rgba(216,174,79,.055);
          font-size: 9px;
        }

        .access-card b {
          font-size: 16px;
        }

        .plan-card {
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .plan-card h2 {
          margin: 0 0 6px;
          font-size: 14px;
        }

        .plan-card p {
          margin: 0;
          color: #6e7076;
          font-size: 9px;
        }

        .plan-card form {
          display: flex;
          gap: 8px;
        }

        .plan-card select {
          min-width: 150px;
        }

        .empty,
        .no-user {
          text-align: center;
          padding: 45px 20px;
          color: #777980;
        }

        .empty div,
        .no-user > div {
          font-size: 28px;
          margin-bottom: 10px;
          color: #b18a39;
        }

        .empty strong,
        .no-user h2 {
          display: block;
          color: #bbbcc1;
          font-size: 13px;
        }

        .empty span,
        .no-user p {
          display: block;
          color: #62646a;
          font-size: 9px;
          margin-top: 6px;
        }

        .empty.compact {
          padding: 25px 10px;
        }

        @media (max-width: 1250px) {
          .content-grid {
            grid-template-columns: 310px minmax(0, 1fr);
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .action-grid {
            grid-template-columns: repeat(2, 1fr);
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
            width: 75px;
            padding: 18px 10px;
          }

          .brand {
            justify-content: center;
          }

          .brand > div:last-child,
          .nav-item {
            font-size: 0;
          }

          .nav-item {
            justify-content: center;
            padding: 0;
          }

          .nav-item span {
            font-size: 18px;
          }

          .admin-mini > div:last-child,
          .logout {
            justify-content: center;
            font-size: 0;
          }

          .admin-mini {
            justify-content: center;
            padding: 8px;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .users-panel {
            position: static;
          }

          .user-list {
            max-height: 320px;
          }
        }

        @media (max-width: 760px) {
          .main {
            padding: 18px 12px 40px;
          }

          .topbar {
            flex-direction: column;
          }

          .top-actions {
            width: 100%;
          }

          .admin-pill {
            margin-right: auto;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .filter-form {
            flex-wrap: wrap;
          }

          .search-box {
            flex-basis: 100%;
          }

          .two-column,
          .access-grid {
            grid-template-columns: 1fr;
          }

          .profile-top {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .profile-plan {
            width: 100%;
          }

          .quick-stats {
            grid-template-columns: 1fr 1fr;
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

          h1 {
            font-size: 23px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .profile-avatar {
            width: 60px;
            height: 60px;
            flex-basis: 60px;
          }

          .profile-main h2 {
            font-size: 17px;
          }

          .subscription-details {
            grid-template-columns: 1fr;
          }

          .action-grid {
            grid-template-columns: 1fr;
          }

          .ticket-title {
            align-items: flex-start;
            flex-direction: column;
          }

          .ticket-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
