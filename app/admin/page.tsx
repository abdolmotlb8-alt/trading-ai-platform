import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPlanName(plan: string) {
  switch (plan) {
    case "FREE":
      return "رایگان";

    case "GUEST":
      return "مهمان";

    case "MONTHLY":
      return "۱ ماهه";

    case "THREE_MONTHS":
      return "۳ ماهه";

    case "SIX_MONTHS":
      return "۶ ماهه";

    case "YEARLY":
      return "۱۲ ماهه";

    default:
      return plan;
  }
}

function getTicketStatus(status: string) {
  switch (status) {
    case "OPEN":
      return {
        label: "باز",
        color: "#fbbf24",
        background: "rgba(251,191,36,0.10)",
        border: "rgba(251,191,36,0.20)",
      };

    case "ANSWERED":
      return {
        label: "پاسخ داده شده",
        color: "#34d399",
        background: "rgba(52,211,153,0.10)",
        border: "rgba(52,211,153,0.20)",
      };

    case "CLOSED":
      return {
        label: "بسته",
        color: "#94a3b8",
        background: "rgba(148,163,184,0.08)",
        border: "rgba(148,163,184,0.15)",
      };

    default:
      return {
        label: status,
        color: "#cbd5e1",
        background: "rgba(203,213,225,0.08)",
        border: "rgba(203,213,225,0.15)",
      };
  }
}

export default async function AdminPage() {
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
      plan: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/");
  }

  const [
    totalUsers,
    guestUsers,
    subscribedUsers,
    totalBots,
    activeBots,
    totalSignals,
    totalTrades,
    openTickets,
    recentUsers,
    recentTickets,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        OR: [
          {
            plan: "FREE",
          },
          {
            plan: "GUEST",
          },
        ],
      },
    }),

    prisma.user.count({
      where: {
        NOT: {
          plan: {
            in: ["FREE", "GUEST"],
          },
        },
      },
    }),

    prisma.tradingBot.count(),

    prisma.tradingBot.count({
      where: {
        isActive: true,
      },
    }),

    prisma.tradingSignal.count(),

    prisma.trade.count(),

    prisma.supportTicket.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        createdAt: true,
      },
    }),

    prisma.supportTicket.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    }),
  ]);

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 85% 0%, rgba(34,211,238,0.12), transparent 28%), radial-gradient(circle at 10% 100%, rgba(99,102,241,0.10), transparent 30%), #020817",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "24px 16px 50px",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "28px",
            border: "1px solid rgba(148,163,184,0.12)",
            background: "rgba(8,25,41,0.82)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.28)",
            padding: "28px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              background: "rgba(34,211,238,0.08)",
              filter: "blur(45px)",
              top: "-80px",
              left: "-60px",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              flexWrap: "wrap",
              gap: "24px",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "17px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(34,211,238,0.10)",
                    border: "1px solid rgba(34,211,238,0.20)",
                    fontSize: "25px",
                  }}
                >
                  🛡️
                </div>

                <div>
                  <div
                    style={{
                      color: "#67e8f9",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "3px",
                    }}
                  >
                    TRADING AI
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "10px",
                      marginTop: "4px",
                      letterSpacing: "2px",
                    }}
                  >
                    ADMIN CONTROL CENTER
                  </div>
                </div>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(26px, 5vw, 40px)",
                  fontWeight: 900,
                }}
              >
                مرکز مدیریت Trading AI
              </h1>

              <p
                style={{
                  color: "#94a3b8",
                  lineHeight: 1.9,
                  maxWidth: "680px",
                  margin: "12px 0 0",
                  fontSize: "14px",
                }}
              >
                تمام بخش‌های مهم پلتفرم از اینجا مدیریت می‌شوند؛
                کاربران، پشتیبانی، اشتراک‌ها، ربات‌ها، سیگنال‌ها و
                فعالیت‌های سیستم.
              </p>
            </div>

            <div
              style={{
                minWidth: "250px",
                borderRadius: "20px",
                border: "1px solid rgba(52,211,153,0.18)",
                background: "rgba(16,185,129,0.06)",
                padding: "17px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#34d399",
                    boxShadow: "0 0 15px rgba(52,211,153,0.7)",
                  }}
                />

                <strong style={{ color: "#6ee7b7", fontSize: "14px" }}>
                  دسترسی مدیر فعال است
                </strong>
              </div>

              <div
                style={{
                  color: "#e2e8f0",
                  fontWeight: 700,
                  marginTop: "12px",
                }}
              >
                {admin.name}
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  marginTop: "5px",
                  direction: "ltr",
                  textAlign: "right",
                }}
              >
                {admin.email}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN STATS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          <StatCard
            icon="👥"
            title="کل کاربران"
            value={formatNumber(totalUsers)}
            color="#22d3ee"
          />

          <StatCard
            icon="🆕"
            title="کاربران مهمان / رایگان"
            value={formatNumber(guestUsers)}
            color="#60a5fa"
          />

          <StatCard
            icon="💎"
            title="کاربران اشتراکی"
            value={formatNumber(subscribedUsers)}
            color="#34d399"
          />

          <StatCard
            icon="🎫"
            title="تیکت‌های باز"
            value={formatNumber(openTickets)}
            color="#fbbf24"
          />

          <StatCard
            icon="🤖"
            title="کل ربات‌ها"
            value={formatNumber(totalBots)}
            color="#a78bfa"
          />

          <StatCard
            icon="⚡"
            title="ربات‌های فعال"
            value={formatNumber(activeBots)}
            color="#c084fc"
          />

          <StatCard
            icon="📡"
            title="سیگنال‌ها"
            value={formatNumber(totalSignals)}
            color="#38bdf8"
          />

          <StatCard
            icon="💰"
            title="معاملات"
            value={formatNumber(totalTrades)}
            color="#fb923c"
          />
        </section>

        {/* QUICK ACCESS */}
        <section style={{ marginBottom: "22px" }}>
          <div style={{ marginBottom: "13px" }}>
            <div
              style={{
                color: "#67e8f9",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "3px",
              }}
            >
              MANAGEMENT
            </div>

            <h2
              style={{
                margin: "7px 0 0",
                fontSize: "22px",
                fontWeight: 900,
              }}
            >
              دسترسی سریع مدیریت
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "12px",
            }}
          >
            <AdminCard
              href="/admin/users"
              icon="👥"
              title="مدیریت کاربران"
              description="مشاهده و کنترل کاربران سایت"
              color="#22d3ee"
            />

            <AdminCard
              href="/admin/support"
              icon="🎫"
              title="مرکز پشتیبانی"
              description="مشاهده و پاسخ به تیکت‌های کاربران"
              color="#fbbf24"
              badge={
                openTickets > 0
                  ? `${formatNumber(openTickets)} تیکت باز`
                  : undefined
              }
            />

            <AdminCard
              href="/admin/plans"
              icon="💎"
              title="اشتراک‌ها"
              description="مدیریت پلن‌ها و دسترسی‌ها"
              color="#34d399"
            />

            <AdminCard
              href="/admin/bots"
              icon="🤖"
              title="مدیریت ربات‌ها"
              description="کنترل و مشاهده ربات‌های کاربران"
              color="#a78bfa"
            />

            <AdminCard
              href="/admin/signals"
              icon="📡"
              title="سیگنال‌ها"
              description="مشاهده و مدیریت سیگنال‌ها"
              color="#38bdf8"
            />

            <AdminCard
              href="/admin/trades"
              icon="💰"
              title="معاملات"
              description="مشاهده فعالیت معاملاتی سیستم"
              color="#fb923c"
            />

            <AdminCard
              href="/admin/news"
              icon="📰"
              title="اخبار و اطلاعیه‌ها"
              description="مدیریت اخبار و اطلاعیه‌های سایت"
              color="#f472b6"
            />

            <AdminCard
              href="/admin/settings"
              icon="⚙️"
              title="تنظیمات سیستم"
              description="کنترل تنظیمات اصلی پلتفرم"
              color="#94a3b8"
            />
          </div>
        </section>

        {/* TWO COLUMNS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          {/* USERS */}
          <section
            style={{
              borderRadius: "24px",
              border: "1px solid rgba(148,163,184,0.10)",
              background: "rgba(8,25,41,0.72)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid rgba(148,163,184,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#67e8f9",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "2px",
                  }}
                >
                  USERS
                </div>

                <h2
                  style={{
                    margin: "7px 0 0",
                    fontSize: "19px",
                    fontWeight: 900,
                  }}
                >
                  کاربران اخیر
                </h2>
              </div>

              <Link
                href="/admin/users"
                style={{
                  color: "#67e8f9",
                  textDecoration: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                مشاهده همه ←
              </Link>
            </div>

            <div>
              {recentUsers.length === 0 ? (
                <div
                  style={{
                    padding: "30px",
                    color: "#64748b",
                    textAlign: "center",
                    fontSize: "13px",
                  }}
                >
                  هنوز کاربری ثبت نشده است.
                </div>
              ) : (
                recentUsers.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      padding: "15px 20px",
                      borderBottom: "1px solid rgba(148,163,184,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          flexShrink: 0,
                          borderRadius: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(34,211,238,0.09)",
                          color: "#67e8f9",
                          fontWeight: 900,
                        }}
                      >
                        {user.name?.charAt(0) || "U"}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "13px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {user.name}
                        </div>

                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "11px",
                            marginTop: "4px",
                            direction: "ltr",
                            textAlign: "right",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        flexShrink: 0,
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color:
                            user.role === "ADMIN"
                              ? "#67e8f9"
                              : "#94a3b8",
                          fontWeight: 700,
                        }}
                      >
                        {user.role === "ADMIN" ? "ADMIN" : "USER"}
                      </div>

                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "10px",
                          color: "#64748b",
                        }}
                      >
                        {getPlanName(user.plan)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SUPPORT */}
          <section
            style={{
              borderRadius: "24px",
              border: "1px solid rgba(148,163,184,0.10)",
              background: "rgba(8,25,41,0.72)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid rgba(148,163,184,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#fbbf24",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "2px",
                  }}
                >
                  SUPPORT
                </div>

                <h2
                  style={{
                    margin: "7px 0 0",
                    fontSize: "19px",
                    fontWeight: 900,
                  }}
                >
                  آخرین تیکت‌ها
                </h2>
              </div>

              <Link
                href="/admin/support"
                style={{
                  color: "#fbbf24",
                  textDecoration: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                مدیریت ←
              </Link>
            </div>

            <div>
              {recentTickets.length === 0 ? (
                <div
                  style={{
                    padding: "30px",
                    color: "#64748b",
                    textAlign: "center",
                    fontSize: "13px",
                  }}
                >
                  هنوز تیکتی ثبت نشده است.
                </div>
              ) : (
                recentTickets.map((ticket) => {
                  const status = getTicketStatus(ticket.status);

                  return (
                    <div
                      key={ticket.id}
                      style={{
                        padding: "15px 20px",
                        borderBottom:
                          "1px solid rgba(148,163,184,0.06)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: "13px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ticket.subject}
                          </div>

                          <div
                            style={{
                              color: "#64748b",
                              fontSize: "11px",
                              marginTop: "5px",
                            }}
                          >
                            {ticket.user.name}
                          </div>

                          {ticket.messages[0] && (
                            <div
                              style={{
                                color: "#94a3b8",
                                fontSize: "11px",
                                lineHeight: 1.8,
                                marginTop: "8px",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {ticket.messages[0].message}
                            </div>
                          )}
                        </div>

                        <span
                          style={{
                            flexShrink: 0,
                            borderRadius: "999px",
                            border: `1px solid ${status.border}`,
                            background: status.background,
                            color: status.color,
                            padding: "5px 9px",
                            fontSize: "9px",
                            fontWeight: 700,
                          }}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: "8px",
                          color: "#475569",
                          fontSize: "9px",
                        }}
                      >
                        {formatDate(ticket.updatedAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </section>

        {/* SYSTEM STATUS */}
        <section
          style={{
            borderRadius: "24px",
            border: "1px solid rgba(34,211,238,0.10)",
            background:
              "linear-gradient(135deg, rgba(8,25,41,0.86), rgba(5,20,34,0.65))",
            padding: "22px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div style={{ fontSize: "22px" }}>🟢</div>

            <div>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 900,
                }}
              >
                وضعیت کلی سیستم
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                کنترل سریع سرویس‌های اصلی
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
            }}
          >
            <SystemStatus title="Database" status="متصل" />
            <SystemStatus title="Authentication" status="فعال" />
            <SystemStatus title="Support API" status="فعال" />
            <SystemStatus title="AI Support" status="فعال" />
            <SystemStatus title="Bots API" status="فعال" />
            <SystemStatus title="Trading Signals" status="آماده" />
          </div>
        </section>

        {/* FOOTER */}
        <footer
          style={{
            textAlign: "center",
            color: "#475569",
            fontSize: "10px",
            padding: "10px",
          }}
        >
          Trading AI — Admin Control Center
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: string;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        borderRadius: "20px",
        border: "1px solid rgba(148,163,184,0.09)",
        background: "rgba(8,25,41,0.72)",
        padding: "17px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "22px" }}>{icon}</span>

        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 12px ${color}`,
          }}
        />
      </div>

      <div
        style={{
          color: "#64748b",
          fontSize: "10px",
          marginTop: "14px",
          lineHeight: 1.6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color,
          fontSize: "23px",
          fontWeight: 900,
          marginTop: "6px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AdminCard({
  href,
  icon,
  title,
  description,
  color,
  badge,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "#fff",
        borderRadius: "22px",
        border: "1px solid rgba(148,163,184,0.10)",
        background: "rgba(8,25,41,0.68)",
        padding: "20px",
        display: "block",
        transition: "transform 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${color}12`,
            border: `1px solid ${color}25`,
            fontSize: "22px",
          }}
        >
          {icon}
        </div>

        <span
          style={{
            color,
            fontSize: "17px",
          }}
        >
          ←
        </span>
      </div>

      <h3
        style={{
          margin: "17px 0 0",
          fontSize: "15px",
          fontWeight: 900,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          color: "#64748b",
          fontSize: "11px",
          lineHeight: 1.8,
          margin: "7px 0 0",
        }}
      >
        {description}
      </p>

      {badge && (
        <div
          style={{
            display: "inline-block",
            marginTop: "12px",
            borderRadius: "999px",
            padding: "5px 9px",
            background: `${color}10`,
            color,
            fontSize: "9px",
            fontWeight: 700,
          }}
        >
          {badge}
        </div>
      )}
    </Link>
  );
}

function SystemStatus({
  title,
  status,
}: {
  title: string;
  status: string;
}) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(52,211,153,0.10)",
        background: "rgba(16,185,129,0.035)",
        padding: "13px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#34d399",
            boxShadow: "0 0 10px rgba(52,211,153,0.7)",
          }}
        />

        <span
          style={{
            color: "#94a3b8",
            fontSize: "10px",
          }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          color: "#6ee7b7",
          fontSize: "11px",
          fontWeight: 800,
          marginTop: "8px",
        }}
      >
        {status}
      </div>
    </div>
  );
}
