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

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function planLabel(plan: string) {
  switch (plan.toUpperCase()) {
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

function planClass(plan: string) {
  switch (plan.toUpperCase()) {
    case "VIP":
      return "gold";
    case "PREMIUM":
      return "purple";
    case "PRO":
      return "blue";
    default:
      return "gray";
  }
}

function subscriptionState(user: {
  plan: string;
  subscriptionExpiresAt: Date | null;
  guestExpiresAt: Date | null;
  guestUsed: boolean;
}) {
  const now = new Date();

  if (
    user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt.getTime() > now.getTime()
  ) {
    return {
      label: "اشتراک فعال",
      className: "active",
    };
  }

  if (
    !user.guestUsed &&
    user.guestExpiresAt &&
    user.guestExpiresAt.getTime() > now.getTime()
  ) {
    return {
      label: "دوره مهمان",
      className: "guest",
    };
  }

  if (user.plan.toUpperCase() !== "FREE") {
    return {
      label: "منقضی شده",
      className: "expired",
    };
  }

  return {
    label: "رایگان",
    className: "free",
  };
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

/*
|--------------------------------------------------------------------------
| Block / Unblock
|--------------------------------------------------------------------------
*/

async function toggleBlockUser(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const userId = normalize(formData.get("userId"));
  const action = normalize(formData.get("action"));
  const reason = normalize(formData.get("reason"));

  if (!userId) {
    return;
  }

  // جلوگیری از مسدود کردن خود ادمین
  if (userId === admin.id) {
    return;
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      isBlocked: true,
    },
  });

  if (!targetUser) {
    return;
  }

  if (String(targetUser.role).toUpperCase() === "ADMIN") {
    return;
  }

  if (action === "block") {
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

    // Sessionهای کاربر مسدودشده را هم حذف می‌کنیم
    await prisma.session.deleteMany({
      where: {
        userId,
      },
    });
  }

  if (action === "unblock") {
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
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

/*
|--------------------------------------------------------------------------
| Change Plan
|--------------------------------------------------------------------------
*/

async function changeUserPlan(formData: FormData) {
  "use server";

  await requireAdmin();

  const userId = normalize(formData.get("userId"));
  const plan = normalize(formData.get("plan")).toUpperCase();

  if (!userId) {
    return;
  }

  const allowedPlans = ["FREE", "VIP", "PREMIUM", "PRO"];

  if (!allowedPlans.includes(plan)) {
    return;
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      plan,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireAdmin();

  const params = await searchParams;

  const q = normalize(params.q);
  const selectedPlan = normalize(params.plan).toUpperCase();
  const selectedStatus = normalize(params.status).toUpperCase();

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

  if (
    selectedPlan &&
    ["FREE", "VIP", "PREMIUM", "PRO"].includes(selectedPlan)
  ) {
    where.plan = selectedPlan;
  }

  if (selectedStatus === "BLOCKED") {
    where.isBlocked = true;
  }

  if (selectedStatus === "ACTIVE") {
    where.isBlocked = false;
  }

  const [
    users,
    totalUsers,
    blockedUsers,
    vipUsers,
    premiumUsers,
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
        subscriptionExpiresAt: {
          gt: new Date(),
        },
        isBlocked: false,
      },
    }),
  ]);

  return (
    <main dir="rtl" className="page">
      <div className="backgroundGlow glowOne" />
      <div className="backgroundGlow glowTwo" />

      <div className="shell">
        {/* HEADER */}
        <header className="topbar">
          <div className="brandArea">
            <Link href="/admin" className="backButton">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M15 18l-6-6 6-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              بازگشت
            </Link>

            <div className="titleBlock">
              <div className="eyebrow">
                <span className="liveDot" />
                ADMIN CONTROL CENTER
              </div>

              <h1>مدیریت کاربران</h1>
              <p>
                مدیریت حساب‌ها، پلن‌ها، وضعیت دسترسی و مسدودسازی کاربران
              </p>
            </div>
          </div>

          <div className="adminBadge">
            <div className="adminIcon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
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
        <section className="statsGrid">
          <div className="statCard">
            <div className="statIcon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M16 20v-1.5a4.5 4.5 0 00-4.5-4.5h-3A4.5 4.5 0 004 18.5V20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle
                  cx="10"
                  cy="7"
                  r="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M16 11a3 3 0 100-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M17 14.5a4.5 4.5 0 013 4V20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <span>کل کاربران</span>
              <strong>{totalUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>

          <div className="statCard">
            <div className="statIcon goldIcon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3l2.2 5.2L20 9l-4.1 4 1 5.7-4.9-2.7-4.9 2.7 1-5.7L4 9l5.8-.8L12 3z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <span>VIP</span>
              <strong>{vipUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>

          <div className="statCard">
            <div className="statIcon purpleIcon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3l7 4v5c0 4.3-2.8 7.9-7 9-4.2-1.1-7-4.7-7-9V7l7-4z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.5 12l1.7 1.7 3.6-3.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <span>Premium</span>
              <strong>{premiumUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>

          <div className="statCard">
            <div className="statIcon greenIcon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 12.5l5 5L20 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <span>اشتراک فعال</span>
              <strong>
                {activeSubscriptions.toLocaleString("fa-IR")}
              </strong>
            </div>
          </div>

          <div className="statCard">
            <div className="statIcon redIcon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3L21 20H3L12 3z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9v5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
            </div>

            <div>
              <span>مسدود شده</span>
              <strong>{blockedUsers.toLocaleString("fa-IR")}</strong>
            </div>
          </div>
        </section>

        {/* FILTER */}
        <section className="controlPanel">
          <form method="GET" className="filterForm">
            <div className="searchBox">
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
                placeholder="جستجو بر اساس نام یا ایمیل..."
              />
            </div>

            <select name="plan" defaultValue={selectedPlan}>
              <option value="">همه پلن‌ها</option>
              <option value="FREE">Free</option>
              <option value="VIP">VIP</option>
              <option value="PREMIUM">Premium</option>
              <option value="PRO">Pro</option>
            </select>

            <select name="status" defaultValue={selectedStatus}>
              <option value="">همه وضعیت‌ها</option>
              <option value="ACTIVE">فعال</option>
              <option value="BLOCKED">مسدود</option>
            </select>

            <button type="submit" className="filterButton">
              اعمال فیلتر
            </button>

            <Link href="/admin/users" className="clearButton">
              پاک کردن
            </Link>
          </form>
        </section>

        {/* TABLE */}
        <section className="usersPanel">
          <div className="panelHeader">
            <div>
              <span className="panelEyebrow">USER DIRECTORY</span>
              <h2>لیست کاربران</h2>
            </div>

            <div className="resultCount">
              {users.length.toLocaleString("fa-IR")} نتیجه
            </div>
          </div>

          {users.length === 0 ? (
            <div className="emptyState">
              <div className="emptyIcon">
                <svg viewBox="0 0 24 24">
                  <circle
                    cx="11"
                    cy="11"
                    r="6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M16 16l5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h3>کاربری پیدا نشد</h3>
              <p>عبارت جستجو یا فیلترهای انتخاب‌شده را تغییر بده.</p>
            </div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>کاربر</th>
                    <th>نقش</th>
                    <th>پلن</th>
                    <th>وضعیت حساب</th>
                    <th>اشتراک</th>
                    <th>ثبت‌نام</th>
                    <th>عملیات</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const subscription = subscriptionState(user);
                    const isAdmin =
                      String(user.role).toUpperCase() === "ADMIN";

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="userCell">
                            <div className="avatar">
                              {normalize(user.name)
                                .charAt(0)
                                .toUpperCase() || "U"}
                            </div>

                            <div className="userInfo">
                              <strong>{user.name}</strong>
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {isAdmin ? (
                            <span className="role adminRole">ADMIN</span>
                          ) : (
                            <span className="role userRole">USER</span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`planBadge ${planClass(user.plan)}`}
                          >
                            {planLabel(user.plan)}
                          </span>
                        </td>

                        <td>
                          {user.isBlocked ? (
                            <div className="statusColumn">
                              <span className="accountStatus blocked">
                                <i />
                                مسدود
                              </span>

                              {user.blockedReason && (
                                <small>{user.blockedReason}</small>
                              )}
                            </div>
                          ) : (
                            <span className="accountStatus active">
                              <i />
                              فعال
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="subscriptionColumn">
                            <span
                              className={`subscriptionBadge ${subscription.className}`}
                            >
                              {subscription.label}
                            </span>

                            {user.subscriptionExpiresAt && (
                              <small>
                                انقضا:{" "}
                                {formatDate(user.subscriptionExpiresAt)}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="dateText">
                            {formatDate(user.createdAt)}
                          </span>
                        </td>

                        <td>
                          <div className="actions">
                            <details className="actionMenu">
                              <summary>مدیریت</summary>

                              <div className="menuContent">
                                <div className="menuTitle">
                                  مدیریت {user.name}
                                </div>

                                {!isAdmin && (
                                  <>
                                    <form action={changeUserPlan}>
                                      <input
                                        type="hidden"
                                        name="userId"
                                        value={user.id}
                                      />

                                      <label>تغییر پلن</label>

                                      <select
                                        name="plan"
                                        defaultValue={user.plan}
                                      >
                                        <option value="FREE">Free</option>
                                        <option value="VIP">VIP</option>
                                        <option value="PREMIUM">
                                          Premium
                                        </option>
                                        <option value="PRO">Pro</option>
                                      </select>

                                      <button
                                        type="submit"
                                        className="menuButton goldButton"
                                      >
                                        ذخیره پلن
                                      </button>
                                    </form>

                                    <div className="menuDivider" />

                                    {user.isBlocked ? (
                                      <form action={toggleBlockUser}>
                                        <input
                                          type="hidden"
                                          name="userId"
                                          value={user.id}
                                        />

                                        <input
                                          type="hidden"
                                          name="action"
                                          value="unblock"
                                        />

                                        <button
                                          type="submit"
                                          className="menuButton greenButton"
                                        >
                                          رفع مسدودی
                                        </button>
                                      </form>
                                    ) : (
                                      <form action={toggleBlockUser}>
                                        <input
                                          type="hidden"
                                          name="userId"
                                          value={user.id}
                                        />

                                        <input
                                          type="hidden"
                                          name="action"
                                          value="block"
                                        />

                                        <input
                                          name="reason"
                                          placeholder="دلیل مسدودی..."
                                          className="reasonInput"
                                        />

                                        <button
                                          type="submit"
                                          className="menuButton redButton"
                                        >
                                          مسدود کردن حساب
                                        </button>
                                      </form>
                                    )}
                                  </>
                                )}

                                {isAdmin && (
                                  <div className="protectedMessage">
                                    <svg viewBox="0 0 24 24">
                                      <path
                                        d="M12 3l7 4v5c0 4.3-2.8 7.9-7 9-4.2-1.1-7-4.7-7-9V7l7-4z"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                      />
                                    </svg>
                                    حساب مدیر سیستم محافظت شده است.
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECURITY NOTE */}
        <section className="securityNote">
          <div className="securityIcon">
            <svg viewBox="0 0 24 24">
              <path
                d="M12 3l7 4v5c0 4.3-2.8 7.9-7 9-4.2-1.1-7-4.7-7-9V7l7-4z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M9.5 12l1.7 1.7 3.6-3.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <strong>کنترل سمت سرور فعال است</strong>
            <p>
              تمام عملیات این صفحه قبل از اجرا دوباره نقش مدیر را بررسی
              می‌کنند. همچنین مدیر نمی‌تواند حساب ADMIN را از این صفحه
              مسدود کند.
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
          color: #f5f7fb;
          background:
            radial-gradient(circle at 10% 0%, rgba(212, 165, 74, 0.10), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(61, 120, 255, 0.08), transparent 25%),
            #05070b;
          padding: 28px;
          position: relative;
          overflow-x: hidden;
        }

        .shell {
          width: min(1500px, 100%);
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .backgroundGlow {
          position: fixed;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          filter: blur(110px);
          pointer-events: none;
          opacity: .16;
        }

        .glowOne {
          top: -220px;
          right: -150px;
          background: #d8a84e;
        }

        .glowTwo {
          bottom: -220px;
          left: -150px;
          background: #2563eb;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .brandArea {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .backButton {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 11px 15px;
          color: #cdd3df;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 13px;
          background: rgba(255,255,255,.035);
          text-decoration: none;
          font-size: 13px;
          transition: .2s ease;
        }

        .backButton:hover {
          color: #fff;
          border-color: rgba(216,168,78,.4);
          background: rgba(216,168,78,.07);
        }

        .backButton svg {
          width: 17px;
          height: 17px;
        }

        .titleBlock {
          border-right: 1px solid rgba(255,255,255,.08);
          padding-right: 22px;
        }

        .eyebrow,
        .panelEyebrow {
          color: #c9a35c;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          direction: ltr;
          justify-content: flex-end;
          margin-bottom: 7px;
        }

        .liveDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #5ee38b;
          box-shadow: 0 0 12px rgba(94,227,139,.7);
        }

        h1 {
          margin: 0;
          font-size: clamp(25px, 3vw, 35px);
          letter-spacing: -.7px;
        }

        .titleBlock p {
          margin: 8px 0 0;
          color: #7f899b;
          font-size: 13px;
        }

        .adminBadge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border: 1px solid rgba(216,168,78,.16);
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(216,168,78,.09), rgba(255,255,255,.025));
        }

        .adminIcon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          color: #dfb968;
          border-radius: 12px;
          background: rgba(216,168,78,.10);
        }

        .adminIcon svg {
          width: 23px;
          height: 23px;
        }

        .adminBadge strong,
        .adminBadge span {
          display: block;
        }

        .adminBadge strong {
          font-size: 13px;
        }

        .adminBadge span {
          margin-top: 3px;
          color: #7e8796;
          font-size: 11px;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 18px;
        }

        .statCard {
          min-height: 108px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 17px;
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 18px;
          background:
            linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.018));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
          backdrop-filter: blur(18px);
        }

        .statIcon {
          flex: 0 0 auto;
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          color: #aeb7c8;
          border-radius: 13px;
          background: rgba(255,255,255,.045);
        }

        .statIcon svg {
          width: 23px;
          height: 23px;
        }

        .goldIcon {
          color: #e0b65f;
          background: rgba(216,168,78,.09);
        }

        .purpleIcon {
          color: #b993ff;
          background: rgba(139,92,246,.09);
        }

        .greenIcon {
          color: #5ee38b;
          background: rgba(34,197,94,.08);
        }

        .redIcon {
          color: #ff7070;
          background: rgba(239,68,68,.08);
        }

        .statCard span {
          display: block;
          color: #7f8999;
          font-size: 11px;
          margin-bottom: 7px;
        }

        .statCard strong {
          font-size: 22px;
          letter-spacing: -.5px;
        }

        .controlPanel,
        .usersPanel {
          border: 1px solid rgba(255,255,255,.065);
          background: rgba(10,13,19,.82);
          box-shadow: 0 20px 60px rgba(0,0,0,.22);
          backdrop-filter: blur(18px);
        }

        .controlPanel {
          padding: 14px;
          border-radius: 18px;
          margin-bottom: 18px;
        }

        .filterForm {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 170px 170px auto auto;
          gap: 9px;
        }

        .searchBox {
          height: 46px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 13px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .searchBox svg {
          width: 18px;
          height: 18px;
          color: #737d8f;
          flex: 0 0 auto;
        }

        .searchBox input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          color: #f2f4f8;
          background: transparent;
          font-family: inherit;
          font-size: 13px;
        }

        .searchBox input::placeholder {
          color: #656e7e;
        }

        select {
          height: 46px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px;
          outline: none;
          color: #dfe4ec;
          background: #10141c;
          font-family: inherit;
          font-size: 12px;
        }

        .filterButton,
        .clearButton {
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 12px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }

        .filterButton {
          color: #090a0c;
          border: 1px solid #d8aa54;
          background: linear-gradient(135deg, #f0ca78, #b8862d);
        }

        .clearButton {
          color: #aab2c0;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
        }

        .usersPanel {
          border-radius: 20px;
          overflow: hidden;
        }

        .panelHeader {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 17px 20px;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .panelHeader h2 {
          margin: 5px 0 0;
          font-size: 19px;
        }

        .resultCount {
          padding: 8px 12px;
          color: #aeb6c5;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          font-size: 11px;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1080px;
          border-collapse: collapse;
        }

        th {
          padding: 13px 16px;
          color: #666f7f;
          background: rgba(255,255,255,.018);
          border-bottom: 1px solid rgba(255,255,255,.05);
          text-align: right;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        td {
          padding: 15px 16px;
          border-bottom: 1px solid rgba(255,255,255,.045);
          vertical-align: middle;
          font-size: 12px;
        }

        tbody tr {
          transition: .18s ease;
        }

        tbody tr:hover {
          background: rgba(255,255,255,.018);
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        .userCell {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 220px;
        }

        .avatar {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          color: #dfb866;
          border: 1px solid rgba(216,168,78,.2);
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(216,168,78,.15), rgba(216,168,78,.04));
          font-size: 14px;
          font-weight: 800;
        }

        .userInfo strong,
        .userInfo span {
          display: block;
        }

        .userInfo strong {
          color: #eef1f6;
          font-size: 12px;
        }

        .userInfo span {
          max-width: 210px;
          overflow: hidden;
          color: #6f7888;
          margin-top: 4px;
          text-overflow: ellipsis;
          white-space: nowrap;
          direction: ltr;
          text-align: right;
          font-size: 10px;
        }

        .role,
        .planBadge,
        .accountStatus,
        .subscriptionBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 8px;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 700;
        }

        .adminRole {
          color: #e4bd68;
          border: 1px solid rgba(216,168,78,.17);
          background: rgba(216,168,78,.08);
        }

        .userRole {
          color: #9ca6b7;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.03);
        }

        .planBadge.gray {
          color: #aeb6c5;
          background: rgba(255,255,255,.05);
        }

        .planBadge.gold {
          color: #e4bd68;
          border: 1px solid rgba(216,168,78,.16);
          background: rgba(216,168,78,.09);
        }

        .planBadge.purple {
          color: #c19bff;
          border: 1px solid rgba(139,92,246,.16);
          background: rgba(139,92,246,.09);
        }

        .planBadge.blue {
          color: #72b7ff;
          border: 1px solid rgba(59,130,246,.16);
          background: rgba(59,130,246,.09);
        }

        .accountStatus {
          border: 1px solid transparent;
        }

        .accountStatus i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .accountStatus.active {
          color: #62dc8c;
          background: rgba(34,197,94,.07);
        }

        .accountStatus.active i {
          background: #5ee38b;
          box-shadow: 0 0 8px rgba(94,227,139,.7);
        }

        .accountStatus.blocked {
          color: #ff7777;
          background: rgba(239,68,68,.07);
        }

        .accountStatus.blocked i {
          background: #ff6464;
        }

        .statusColumn small,
        .subscriptionColumn small {
          display: block;
          max-width: 170px;
          margin-top: 5px;
          overflow: hidden;
          color: #606979;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
        }

        .subscriptionBadge.active {
          color: #5fe18b;
          background: rgba(34,197,94,.07);
        }

        .subscriptionBadge.guest {
          color: #68c8ff;
          background: rgba(59,130,246,.08);
        }

        .subscriptionBadge.expired {
          color: #ff7b7b;
          background: rgba(239,68,68,.07);
        }

        .subscriptionBadge.free {
          color: #9099a9;
          background: rgba(255,255,255,.04);
        }

        .dateText {
          color: #7e8797;
          font-size: 10px;
          white-space: nowrap;
        }

        .actionMenu {
          position: relative;
          min-width: 100px;
        }

        .actionMenu summary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          color: #d8b465;
          border: 1px solid rgba(216,168,78,.16);
          border-radius: 9px;
          background: rgba(216,168,78,.06);
          cursor: pointer;
          list-style: none;
          font-size: 10px;
          font-weight: 700;
          user-select: none;
        }

        .actionMenu summary::-webkit-details-marker {
          display: none;
        }

        .menuContent {
          position: absolute;
          z-index: 30;
          top: calc(100% + 8px);
          left: 0;
          width: 230px;
          padding: 13px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 14px;
          background: #0d1118;
          box-shadow: 0 25px 70px rgba(0,0,0,.55);
        }

        .menuTitle {
          margin-bottom: 11px;
          color: #dfe4eb;
          font-size: 11px;
          font-weight: 800;
        }

        .menuContent form {
          display: grid;
          gap: 7px;
        }

        .menuContent label {
          color: #777f8f;
          font-size: 9px;
        }

        .menuContent select,
        .reasonInput {
          width: 100%;
          height: 38px;
          padding: 0 9px;
          color: #dce1e9;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 9px;
          background: #151a23;
          outline: none;
          font-family: inherit;
          font-size: 10px;
        }

        .reasonInput::placeholder {
          color: #596272;
        }

        .menuButton {
          width: 100%;
          height: 37px;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          font-size: 10px;
          font-weight: 800;
        }

        .goldButton {
          color: #08090b;
          border: 0;
          background: linear-gradient(135deg, #efc873, #b98a35);
        }

        .greenButton {
          color: #62e191;
          border: 1px solid rgba(34,197,94,.16);
          background: rgba(34,197,94,.07);
        }

        .redButton {
          color: #ff7777;
          border: 1px solid rgba(239,68,68,.16);
          background: rgba(239,68,68,.07);
        }

        .menuDivider {
          height: 1px;
          margin: 12px 0;
          background: rgba(255,255,255,.055);
        }

        .protectedMessage {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          color: #d8b465;
          border-radius: 10px;
          background: rgba(216,168,78,.06);
          font-size: 10px;
          line-height: 1.8;
        }

        .protectedMessage svg {
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
        }

        .emptyState {
          min-height: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .emptyIcon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          color: #717b8d;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .emptyIcon svg {
          width: 25px;
          height: 25px;
        }

        .emptyState h3 {
          margin: 15px 0 6px;
          font-size: 15px;
        }

        .emptyState p {
          margin: 0;
          color: #70798a;
          font-size: 11px;
        }

        .securityNote {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-top: 17px;
          padding: 15px 17px;
          border: 1px solid rgba(34,197,94,.10);
          border-radius: 16px;
          background: rgba(34,197,94,.025);
        }

        .securityIcon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #5ee38b;
          border-radius: 11px;
          background: rgba(34,197,94,.07);
        }

        .securityIcon svg {
          width: 20px;
          height: 20px;
        }

        .securityNote strong {
          display: block;
          margin-bottom: 4px;
          color: #aee9c3;
          font-size: 11px;
        }

        .securityNote p {
          margin: 0;
          color: #697385;
          font-size: 10px;
          line-height: 1.9;
        }

        @media (max-width: 1100px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .filterForm {
            grid-template-columns: 1fr 1fr;
          }

          .searchBox {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 15px;
          }

          .topbar {
            align-items: stretch;
            flex-direction: column;
          }

          .brandArea {
            align-items: flex-start;
            flex-direction: column;
          }

          .titleBlock {
            width: 100%;
            padding-right: 0;
            border-right: 0;
          }

          .adminBadge {
            align-self: flex-start;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filterForm {
            grid-template-columns: 1fr;
          }

          .searchBox {
            grid-column: auto;
          }

          .panelHeader {
            padding: 15px;
          }
        }

        @media (max-width: 480px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 25px;
          }

          .titleBlock p {
            line-height: 1.8;
          }
        }
      `}</style>
    </main>
  );
}
