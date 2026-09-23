import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  plan?: string;
  status?: string;
};

const PLANS = ["FREE", "VIP", "PREMIUM", "PRO"] as const;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function daysLeft(date: Date | null | undefined) {
  if (!date) return null;

  const diff = date.getTime() - Date.now();

  if (diff <= 0) return 0;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function planName(plan: string) {
  switch (plan.toUpperCase()) {
    case "VIP":
      return "VIP";
    case "PREMIUM":
      return "PREMIUM";
    case "PRO":
      return "PRO";
    default:
      return "FREE";
  }
}

function planClass(plan: string) {
  switch (plan.toUpperCase()) {
    case "VIP":
      return "vip";
    case "PREMIUM":
      return "premium";
    case "PRO":
      return "pro";
    default:
      return "free";
  }
}

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

  if (!admin || String(admin.role).toUpperCase() !== "ADMIN") {
    redirect("/");
  }

  return admin;
}

/* =========================================================
   تغییر پلن
========================================================= */

async function changePlan(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const userId = text(formData.get("userId"));
  const plan = text(formData.get("plan")).toUpperCase();

  if (!userId || !PLANS.includes(plan as (typeof PLANS)[number])) {
    return;
  }

  if (userId === admin.id) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || String(user.role).toUpperCase() === "ADMIN") {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

/* =========================================================
   فعال سازی / تمدید اشتراک
========================================================= */

async function activateSubscription(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const userId = text(formData.get("userId"));
  const plan = text(formData.get("plan")).toUpperCase();
  const daysRaw = Number(formData.get("days"));

  if (!userId) return;

  if (!["VIP", "PREMIUM", "PRO"].includes(plan)) {
    return;
  }

  if (![7, 30, 90, 365].includes(daysRaw)) {
    return;
  }

  if (userId === admin.id) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!user || String(user.role).toUpperCase() === "ADMIN") {
    return;
  }

  const now = new Date();

  const currentExpiry =
    user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt.getTime() > now.getTime()
      ? user.subscriptionExpiresAt
      : now;

  const expiresAt = new Date(currentExpiry);

  expiresAt.setDate(expiresAt.getDate() + daysRaw);

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        plan,
        subscriptionStartedAt:
          user.subscriptionExpiresAt &&
          user.subscriptionExpiresAt.getTime() > now.getTime()
            ? undefined
            : now,
        subscriptionExpiresAt: expiresAt,
      },
    }),

    prisma.userSubscription.create({
      data: {
        userId,
        plan,
        status: "ACTIVE",
        startsAt: now,
        expiresAt,
        note: `فعال‌سازی/تمدید توسط مدیر: ${daysRaw} روز`,
        autoRenew: false,
      },
    }),

    prisma.userNotification.create({
      data: {
        userId,
        type: "SUBSCRIPTION",
        title: "اشتراک شما فعال شد",
        message: `پلن ${plan} برای شما تا ${formatDate(expiresAt)} فعال است.`,
        dedupeKey: `subscription-${userId}-${expiresAt.getTime()}-${Date.now()}`,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

/* =========================================================
   مسدود / رفع مسدودی
========================================================= */

async function toggleBlock(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const userId = text(formData.get("userId"));
  const action = text(formData.get("action"));
  const reason = text(formData.get("reason"));

  if (!userId || userId === admin.id) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      isBlocked: true,
    },
  });

  if (!user || String(user.role).toUpperCase() === "ADMIN") {
    return;
  }

  if (action === "BLOCK") {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: reason || "مسدود شده توسط مدیر",
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
        type: "ACCOUNT",
        title: "حساب شما مسدود شد",
        message:
          reason || "دسترسی حساب شما توسط مدیریت سیستم متوقف شده است.",
        dedupeKey: `blocked-${userId}-${Date.now()}`,
      },
    });
  }

  if (action === "UNBLOCK") {
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
        type: "ACCOUNT",
        title: "حساب شما فعال شد",
        message: "دسترسی حساب شما توسط مدیریت سیستم فعال شد.",
        dedupeKey: `unblocked-${userId}-${Date.now()}`,
      },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

/* =========================================================
   Page
========================================================= */

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireAdmin();

  const params = await searchParams;

  const q = text(params.q);
  const selectedPlan = text(params.plan).toUpperCase();
  const selectedStatus = text(params.status).toUpperCase();

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

  if (PLANS.includes(selectedPlan as (typeof PLANS)[number])) {
    where.plan = selectedPlan;
  }

  if (selectedStatus === "ACTIVE") {
    where.isBlocked = false;
  }

  if (selectedStatus === "BLOCKED") {
    where.isBlocked = true;
  }

  const now = new Date();

  const [
    users,
    totalUsers,
    blockedUsers,
    vipUsers,
    premiumUsers,
    proUsers,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.user.findMany({
      where,
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
        guestUsed: true,
        guestStartedAt: true,
        guestExpiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    }),

    prisma.user.count(),

    prisma.user.count({
      where: {
        isBlocked: true,
      },
    }),

    prisma.user.count({
      where: {
        plan: "VIP",
      },
    }),

    prisma.user.count({
      where: {
        plan: "PREMIUM",
      },
    }),

    prisma.user.count({
      where: {
        plan: "PRO",
      },
    }),

    prisma.user.count({
      where: {
        isBlocked: false,
        subscriptionExpiresAt: {
          gt: now,
        },
      },
    }),
  ]);

  return (
    <main dir="rtl" className="page">
      <div className="ambient ambientGold" />
      <div className="ambient ambientBlue" />

      <div className="container">

        {/* HEADER */}

        <header className="header">
          <div className="headerLeft">
            <Link href="/admin" className="back">
              <span>‹</span>
              مرکز مدیریت
            </Link>

            <div className="headerTitle">
              <div className="miniLabel">
                <i />
                USER MANAGEMENT
              </div>

              <h1>کاربران</h1>

              <p>
                مدیریت حساب‌ها، اشتراک‌ها و دسترسی کاربران
              </p>
            </div>
          </div>

          <div className="adminProfile">
            <div className="shield">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M9 12l2 2 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <strong>{admin.name}</strong>
              <span>مدیر سیستم</span>
            </div>
          </div>
        </header>

        {/* STATS */}

        <section className="stats">

          <div className="stat">
            <div className="statIcon users">
              <span>◉</span>
            </div>

            <div>
              <small>کل کاربران</small>
              <strong>{totalUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="statIcon active">
              <span>✓</span>
            </div>

            <div>
              <small>اشتراک فعال</small>
              <strong>
                {activeSubscriptions.toLocaleString("fa-IR")}
              </strong>
            </div>
          </div>

          <div className="stat">
            <div className="statIcon vip">
              <span>★</span>
            </div>

            <div>
              <small>VIP</small>
              <strong>{vipUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="statIcon premium">
              <span>◆</span>
            </div>

            <div>
              <small>Premium</small>
              <strong>{premiumUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="statIcon pro">
              <span>↗</span>
            </div>

            <div>
              <small>Pro</small>
              <strong>{proUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="statIcon blocked">
              <span>!</span>
            </div>

            <div>
              <small>مسدود</small>
              <strong>{blockedUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>

        </section>

        {/* SEARCH */}

        <section className="toolbar">

          <form method="GET" className="filters">

            <div className="search">
              <svg viewBox="0 0 24 24">
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M16 16l5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <input
                name="q"
                defaultValue={q}
                placeholder="نام یا ایمیل کاربر..."
              />
            </div>

            <select
              name="plan"
              defaultValue={selectedPlan}
            >
              <option value="">تمام پلن‌ها</option>
              <option value="FREE">FREE</option>
              <option value="VIP">VIP</option>
              <option value="PREMIUM">PREMIUM</option>
              <option value="PRO">PRO</option>
            </select>

            <select
              name="status"
              defaultValue={selectedStatus}
            >
              <option value="">تمام وضعیت‌ها</option>
              <option value="ACTIVE">فعال</option>
              <option value="BLOCKED">مسدود</option>
            </select>

            <button type="submit">
              جستجو
            </button>

            <Link href="/admin/users">
              پاک کردن
            </Link>

          </form>

        </section>

        {/* MAIN USER LIST */}

        <section className="userPanel">

          <div className="panelTop">
            <div>
              <span>USER DIRECTORY</span>
              <h2>لیست کاربران</h2>
            </div>

            <div className="result">
              {users.length.toLocaleString("fa-IR")} کاربر
            </div>
          </div>

          {users.length === 0 ? (

            <div className="empty">
              <div>⌕</div>
              <h3>کاربری پیدا نشد</h3>
              <p>
                جستجو یا فیلترهای انتخاب‌شده را تغییر بده.
              </p>
            </div>

          ) : (

            <div className="users">

              {users.map((user) => {
                const isAdmin =
                  String(user.role).toUpperCase() === "ADMIN";

                const remaining =
                  daysLeft(user.subscriptionExpiresAt);

                const active =
                  !user.isBlocked &&
                  !!user.subscriptionExpiresAt &&
                  remaining !== null &&
                  remaining > 0;

                const guestActive =
                  !user.guestUsed &&
                  !!user.guestExpiresAt &&
                  user.guestExpiresAt.getTime() > Date.now();

                return (
                  <article
                    key={user.id}
                    className={`userCard ${
                      user.isBlocked ? "isBlocked" : ""
                    }`}
                  >

                    {/* USER */}

                    <div className="identity">

                      <div className="avatar">
                        {text(user.name)
                          .charAt(0)
                          .toUpperCase() || "U"}
                      </div>

                      <div className="identityText">

                        <div className="nameRow">
                          <strong>{user.name}</strong>

                          {isAdmin && (
                            <span className="adminTag">
                              ADMIN
                            </span>
                          )}
                        </div>

                        <span className="email">
                          {user.email}
                        </span>

                        <span className="joined">
                          عضویت: {formatDate(user.createdAt)}
                        </span>

                      </div>

                    </div>

                    {/* PLAN */}

                    <div className="userColumn">

                      <label>پلن</label>

                      <span
                        className={`plan ${planClass(
                          user.plan
                        )}`}
                      >
                        {planName(user.plan)}
                      </span>

                    </div>

                    {/* ACCOUNT STATUS */}

                    <div className="userColumn">

                      <label>حساب</label>

                      {user.isBlocked ? (

                        <div>
                          <span className="status blocked">
                            <i />
                            مسدود
                          </span>

                          {user.blockedReason && (
                            <small className="reason">
                              {user.blockedReason}
                            </small>
                          )}
                        </div>

                      ) : (

                        <span className="status active">
                          <i />
                          فعال
                        </span>

                      )}

                    </div>

                    {/* SUBSCRIPTION */}

                    <div className="userColumn subscription">

                      <label>اشتراک</label>

                      {active ? (

                        <>
                          <span className="subscriptionActive">
                            فعال
                          </span>

                          <small>
                            {remaining === 1
                              ? "فردا منقضی می‌شود"
                              : `${remaining} روز باقی‌مانده`}
                          </small>
                        </>

                      ) : guestActive ? (

                        <>
                          <span className="guest">
                            Guest
                          </span>

                          <small>
                            تا{" "}
                            {formatDate(
                              user.guestExpiresAt
                            )}
                          </small>
                        </>

                      ) : user.plan !== "FREE" ? (

                        <>
                          <span className="expired">
                            منقضی
                          </span>

                          {user.subscriptionExpiresAt && (
                            <small>
                              {formatDate(
                                user.subscriptionExpiresAt
                              )}
                            </small>
                          )}
                        </>

                      ) : (

                        <span className="freeText">
                          رایگان
                        </span>

                      )}

                    </div>

                    {/* ACTIONS */}

                    <div className="actions">

                      {!isAdmin && (
                        <details className="manage">

                          <summary>
                            مدیریت
                            <span>⌄</span>
                          </summary>

                          <div className="menu">

                            {/* CHANGE PLAN */}

                            <div className="menuSection">

                              <span className="menuLabel">
                                تغییر پلن
                              </span>

                              <form action={changePlan}>

                                <input
                                  type="hidden"
                                  name="userId"
                                  value={user.id}
                                />

                                <select
                                  name="plan"
                                  defaultValue={user.plan}
                                >
                                  <option value="FREE">
                                    FREE
                                  </option>
                                  <option value="VIP">
                                    VIP
                                  </option>
                                  <option value="PREMIUM">
                                    PREMIUM
                                  </option>
                                  <option value="PRO">
                                    PRO
                                  </option>
                                </select>

                                <button
                                  type="submit"
                                  className="goldAction"
                                >
                                  ذخیره پلن
                                </button>

                              </form>

                            </div>

                            {/* SUBSCRIPTION */}

                            <div className="menuSection">

                              <span className="menuLabel">
                                فعال‌سازی / تمدید
                              </span>

                              <form
                                action={activateSubscription}
                              >

                                <input
                                  type="hidden"
                                  name="userId"
                                  value={user.id}
                                />

                                <select
                                  name="plan"
                                  defaultValue={
                                    user.plan === "FREE"
                                      ? "VIP"
                                      : user.plan
                                  }
                                >
                                  <option value="VIP">
                                    VIP
                                  </option>
                                  <option value="PREMIUM">
                                    PREMIUM
                                  </option>
                                  <option value="PRO">
                                    PRO
                                  </option>
                                </select>

                                <select
                                  name="days"
                                  defaultValue="30"
                                >
                                  <option value="7">
                                    7 روز
                                  </option>
                                  <option value="30">
                                    30 روز
                                  </option>
                                  <option value="90">
                                    90 روز
                                  </option>
                                  <option value="365">
                                    1 سال
                                  </option>
                                </select>

                                <button
                                  type="submit"
                                  className="greenAction"
                                >
                                  فعال / تمدید اشتراک
                                </button>

                              </form>

                            </div>

                            {/* BLOCK */}

                            <div className="menuSection dangerSection">

                              <span className="menuLabel">
                                کنترل دسترسی
                              </span>

                              {user.isBlocked ? (

                                <form action={toggleBlock}>

                                  <input
                                    type="hidden"
                                    name="userId"
                                    value={user.id}
                                  />

                                  <input
                                    type="hidden"
                                    name="action"
                                    value="UNBLOCK"
                                  />

                                  <button
                                    type="submit"
                                    className="restoreAction"
                                  >
                                    رفع مسدودی
                                  </button>

                                </form>

                              ) : (

                                <form action={toggleBlock}>

                                  <input
                                    type="hidden"
                                    name="userId"
                                    value={user.id}
                                  />

                                  <input
                                    type="hidden"
                                    name="action"
                                    value="BLOCK"
                                  />

                                  <input
                                    type="text"
                                    name="reason"
                                    placeholder="دلیل مسدودی..."
                                  />

                                  <button
                                    type="submit"
                                    className="dangerAction"
                                  >
                                    مسدود کردن حساب
                                  </button>

                                </form>

                              )}

                            </div>

                          </div>

                        </details>
                      )}

                      {isAdmin && (
                        <span className="protected">
                          حساب محافظت‌شده
                        </span>
                      )}

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        </section>

        {/* SECURITY */}

        <section className="security">

          <div className="securityIcon">
            ✓
          </div>

          <div>
            <strong>
              سیستم مدیریت امن است
            </strong>

            <p>
              تمام عملیات مدیریتی سمت سرور بررسی می‌شوند.
              حساب‌های ADMIN قابل مسدودسازی یا تغییر از این
              بخش نیستند و هنگام مسدودسازی کاربر، Sessionهای
              فعال او نیز حذف می‌شوند.
            </p>
          </div>

        </section>

      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 80% -10%,
              rgba(202,155,62,.11),
              transparent 30%
            ),
            radial-gradient(
              circle at 5% 60%,
              rgba(21,94,140,.08),
              transparent 30%
            ),
            #05070b;

          color: #f4f5f7;
          padding: 28px;
          position: relative;
          overflow-x: hidden;
        }

        .container {
          width: min(1500px, 100%);
          margin: auto;
          position: relative;
          z-index: 2;
        }

        .ambient {
          position: fixed;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          filter: blur(130px);
          pointer-events: none;
          opacity: .14;
        }

        .ambientGold {
          top: -250px;
          right: -150px;
          background: #d9a943;
        }

        .ambientBlue {
          bottom: -250px;
          left: -150px;
          background: #0c7cc4;
        }

        /* HEADER */

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .headerLeft {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .back {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 42px;
          padding: 0 14px;
          color: #aab2c0;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
          text-decoration: none;
          font-size: 11px;
          transition: .2s;
        }

        .back:hover {
          color: #e1b85c;
          border-color: rgba(216,168,78,.3);
        }

        .back span {
          font-size: 24px;
          line-height: 0;
        }

        .headerTitle {
          border-right: 1px solid rgba(255,255,255,.08);
          padding-right: 22px;
        }

        .miniLabel {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #c9a45c;
          direction: ltr;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 7px;
        }

        .miniLabel i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #5ce18b;
          box-shadow: 0 0 10px #5ce18b;
        }

        h1 {
          margin: 0;
          font-size: 31px;
          letter-spacing: -.7px;
        }

        .headerTitle p {
          margin: 6px 0 0;
          color: #737c8c;
          font-size: 11px;
        }

        .adminProfile {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 175px;
          padding: 9px 12px;
          border: 1px solid rgba(216,168,78,.15);
          border-radius: 15px;
          background: linear-gradient(
            135deg,
            rgba(216,168,78,.08),
            rgba(255,255,255,.025)
          );
        }

        .shield {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          color: #dfb764;
          border-radius: 11px;
          background: rgba(216,168,78,.09);
        }

        .shield svg {
          width: 21px;
          height: 21px;
        }

        .adminProfile strong,
        .adminProfile span {
          display: block;
        }

        .adminProfile strong {
          font-size: 11px;
        }

        .adminProfile span {
          margin-top: 3px;
          color: #717a89;
          font-size: 9px;
        }

        /* STATS */

        .stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 86px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.035),
              rgba(255,255,255,.012)
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.02);
        }

        .statIcon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 11px;
          font-size: 17px;
        }

        .statIcon.users {
          color: #73c5ff;
          background: rgba(59,130,246,.09);
        }

        .statIcon.active {
          color: #5de18a;
          background: rgba(34,197,94,.08);
        }

        .statIcon.vip {
          color: #e1b65c;
          background: rgba(216,168,78,.09);
        }

        .statIcon.premium {
          color: #bd91ff;
          background: rgba(139,92,246,.09);
        }

        .statIcon.pro {
          color: #65b4ff;
          background: rgba(59,130,246,.08);
        }

        .statIcon.blocked {
          color: #ff7777;
          background: rgba(239,68,68,.08);
        }

        .stat small {
          display: block;
          color: #6e7788;
          font-size: 9px;
          margin-bottom: 6px;
        }

        .stat strong {
          font-size: 19px;
        }

        /* TOOLBAR */

        .toolbar {
          padding: 12px;
          margin-bottom: 15px;
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 16px;
          background: rgba(9,12,17,.75);
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(280px, 1fr) 170px 170px auto auto;
          gap: 8px;
        }

        .search {
          height: 44px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 11px;
          background: rgba(255,255,255,.022);
        }

        .search svg {
          width: 17px;
          height: 17px;
          color: #687284;
        }

        .search input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #edf0f5;
          font-family: inherit;
          font-size: 11px;
        }

        .search input::placeholder {
          color: #606a7a;
        }

        .filters select {
          height: 44px;
          padding: 0 10px;
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 11px;
          background: #10141b;
          color: #cbd1db;
          outline: 0;
          font-family: inherit;
          font-size: 10px;
        }

        .filters button,
        .filters a {
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 17px;
          border-radius: 11px;
          text-decoration: none;
          font-family: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .filters button {
          border: 1px solid #d8aa55;
          color: #090a0c;
          background: linear-gradient(
            135deg,
            #f0ca77,
            #b88732
          );
        }

        .filters a {
          color: #9ea7b7;
          border: 1px solid rgba(255,255,255,.065);
          background: rgba(255,255,255,.025);
        }

        /* PANEL */

        .userPanel {
          overflow: visible;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 18px;
          background: rgba(8,11,16,.78);
          box-shadow: 0 25px 80px rgba(0,0,0,.22);
        }

        .panelTop {
          min-height: 77px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 18px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        .panelTop > div:first-child span {
          color: #c9a45c;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .panelTop h2 {
          margin: 5px 0 0;
          font-size: 18px;
        }

        .result {
          padding: 7px 11px;
          color: #8d96a6;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 9px;
          background: rgba(255,255,255,.025);
          font-size: 9px;
        }

        /* USER CARDS */

        .users {
          display: flex;
          flex-direction: column;
        }

        .userCard {
          display: grid;
          grid-template-columns: minmax(260px, 1.8fr) .65fr .85fr 1fr auto;
          align-items: center;
          gap: 18px;
          min-height: 102px;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,.045);
          transition: background .2s;
        }

        .userCard:hover {
          background: rgba(255,255,255,.018);
        }

        .userCard:last-child {
          border-bottom: 0;
        }

        .userCard.isBlocked {
          background: rgba(239,68,68,.018);
        }

        .identity {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .avatar {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #dfb762;
          border: 1px solid rgba(216,168,78,.17);
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              rgba(216,168,78,.13),
              rgba(216,168,78,.035)
            );
          font-size: 15px;
          font-weight: 900;
        }

        .identityText {
          min-width: 0;
        }

        .nameRow {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .nameRow strong {
          color: #e9ecf1;
          font-size: 12px;
        }

        .adminTag {
          padding: 3px 6px;
          color: #e4bb62;
          border: 1px solid rgba(216,168,78,.14);
          border-radius: 5px;
          background: rgba(216,168,78,.06);
          font-size: 7px;
          font-weight: 800;
        }

        .email,
        .joined {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .email {
          margin-top: 4px;
          color: #717a8b;
          direction: ltr;
          text-align: right;
          font-size: 9px;
        }

        .joined {
          margin-top: 3px;
          color: #555e6d;
          font-size: 8px;
        }

        .userColumn {
          min-width: 0;
        }

        .userColumn label {
          display: block;
          color: #555f70;
          margin-bottom: 7px;
          font-size: 8px;
        }

        .plan,
        .status,
        .subscriptionActive,
        .guest,
        .expired,
        .freeText {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 8px;
          border-radius: 7px;
          font-size: 8px;
          font-weight: 800;
          white-space: nowrap;
        }

        .plan.free {
          color: #a0a8b5;
          background: rgba(255,255,255,.045);
        }

        .plan.vip {
          color: #e4ba5f;
          border: 1px solid rgba(216,168,78,.13);
          background: rgba(216,168,78,.08);
        }

        .plan.premium {
          color: #c29aff;
          border: 1px solid rgba(139,92,246,.13);
          background: rgba(139,92,246,.08);
        }

        .plan.pro {
          color: #6bb9ff;
          border: 1px solid rgba(59,130,246,.13);
          background: rgba(59,130,246,.08);
        }

        .status {
          gap: 5px;
        }

        .status i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .status.active {
          color: #5fe08a;
          background: rgba(34,197,94,.065);
        }

        .status.active i {
          background: #5fe08a;
          box-shadow: 0 0 7px #5fe08a;
        }

        .status.blocked {
          color: #ff7474;
          background: rgba(239,68,68,.065);
        }

        .status.blocked i {
          background: #ff7474;
        }

        .reason {
          display: block;
          max-width: 130px;
          margin-top: 5px;
          overflow: hidden;
          color: #686f7d;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 7px;
        }

        .subscriptionActive {
          color: #5ee18a;
          background: rgba(34,197,94,.065);
        }

        .guest {
          color: #67c8ff;
          background: rgba(59,130,246,.07);
        }

        .expired {
          color: #ff7474;
          background: rgba(239,68,68,.06);
        }

        .freeText {
          color: #858e9e;
          background: rgba(255,255,255,.035);
        }

        .subscription small {
          display: block;
          margin-top: 5px;
          color: #616a79;
          font-size: 7px;
        }

        /* ACTIONS */

        .actions {
          display: flex;
          justify-content: flex-end;
        }

        .manage {
          position: relative;
        }

        .manage summary {
          min-width: 85px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 10px;
          color: #dfb65d;
          border: 1px solid rgba(216,168,78,.17);
          border-radius: 9px;
          background: rgba(216,168,78,.055);
          cursor: pointer;
          list-style: none;
          font-size: 9px;
          font-weight: 800;
        }

        .manage summary::-webkit-details-marker {
          display: none;
        }

        .manage summary span {
          font-size: 15px;
          line-height: 0;
        }

        .menu {
          position: absolute;
          z-index: 100;
          top: calc(100% + 8px);
          left: 0;
          width: 245px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          background: #0d1118;
          box-shadow: 0 30px 80px rgba(0,0,0,.6);
        }

        .menuSection {
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .menuSection:last-child {
          padding-bottom: 0;
          margin-bottom: 0;
          border-bottom: 0;
        }

        .menuLabel {
          display: block;
          margin-bottom: 7px;
          color: #70798a;
          font-size: 8px;
          font-weight: 700;
        }

        .menu form {
          display: grid;
          gap: 6px;
        }

        .menu select,
        .menu input {
          width: 100%;
          height: 35px;
          padding: 0 8px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 8px;
          outline: 0;
          background: #151a22;
          color: #dce1e8;
          font-family: inherit;
          font-size: 9px;
        }

        .menu input::placeholder {
          color: #555e6c;
        }

        .menu button {
          width: 100%;
          height: 35px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .goldAction {
          color: #090a0c;
          border: 0;
          background: linear-gradient(
            135deg,
            #edc56e,
            #b88632
          );
        }

        .greenAction {
          color: #64e292;
          border: 1px solid rgba(34,197,94,.13);
          background: rgba(34,197,94,.07);
        }

        .restoreAction {
          color: #64e292;
          border: 1px solid rgba(34,197,94,.13);
          background: rgba(34,197,94,.07);
        }

        .dangerAction {
          color: #ff7777;
          border: 1px solid rgba(239,68,68,.14);
          background: rgba(239,68,68,.07);
        }

        .protected {
          padding: 8px 10px;
          color: #767f90;
          border-radius: 8px;
          background: rgba(255,255,255,.025);
          font-size: 8px;
          white-space: nowrap;
        }

        /* EMPTY */

        .empty {
          min-height: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #737c8c;
          text-align: center;
        }

        .empty > div {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 15px;
          background: rgba(255,255,255,.025);
          font-size: 25px;
        }

        .empty h3 {
          margin: 13px 0 5px;
          color: #dfe3e9;
          font-size: 14px;
        }

        .empty p {
          margin: 0;
          font-size: 9px;
        }

        /* SECURITY */

        .security {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-top: 14px;
          padding: 13px 15px;
          border: 1px solid rgba(34,197,94,.08);
          border-radius: 14px;
          background: rgba(34,197,94,.018);
        }

        .securityIcon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #5de08a;
          border-radius: 10px;
          background: rgba(34,197,94,.06);
          font-size: 15px;
          font-weight: 900;
        }

        .security strong {
          display: block;
          color: #a5e8bc;
          font-size: 10px;
        }

        .security p {
          margin: 4px 0 0;
          color: #626c7c;
          font-size: 8px;
          line-height: 1.9;
        }

        /* RESPONSIVE */

        @media (max-width: 1200px) {
          .stats {
            grid-template-columns: repeat(3, 1fr);
          }

          .userCard {
            grid-template-columns:
              minmax(240px, 1.6fr)
              .7fr
              .8fr
              .9fr
              auto;
          }
        }

        @media (max-width: 900px) {
          .page {
            padding: 15px;
          }

          .header {
            align-items: stretch;
            flex-direction: column;
          }

          .headerLeft {
            align-items: flex-start;
            flex-direction: column;
          }

          .headerTitle {
            width: 100%;
            padding-right: 0;
            border-right: 0;
          }

          .adminProfile {
            align-self: flex-start;
          }

          .filters {
            grid-template-columns: 1fr 1fr;
          }

          .search {
            grid-column: 1 / -1;
          }

          .filters button,
          .filters a {
            width: 100%;
          }

          .userCard {
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            padding: 17px;
          }

          .identity {
            grid-column: 1 / -1;
          }

          .actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 560px) {
          .stats {
            grid-template-columns: 1fr 1fr;
          }

          .filters {
            grid-template-columns: 1fr;
          }

          .search {
            grid-column: auto;
          }

          h1 {
            font-size: 26px;
          }

          .userCard {
            grid-template-columns: 1fr;
          }

          .identity {
            grid-column: auto;
          }

          .actions {
            justify-content: stretch;
          }

          .manage,
          .manage summary {
            width: 100%;
          }

          .menu {
            position: relative;
            top: 7px;
            left: auto;
            width: 100%;
            margin-bottom: 7px;
          }
        }

      `}</style>
    </main>
  );
}
