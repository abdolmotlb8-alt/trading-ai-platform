import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import UserActions from "./UserActions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: "#06111f",
          color: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
            width: "100%",
            background: "#0a1929",
            border: "1px solid #17304a",
            borderRadius: "24px",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "45px" }}>🔐</div>

          <h1>ورود لازم است</h1>

          <p style={{ color: "#94a3b8", lineHeight: 1.8 }}>
            برای مشاهده مدیریت کاربران ابتدا وارد حساب شوید.
          </p>

          <Link
            href="/login"
            style={{
              display: "inline-block",
              marginTop: "18px",
              padding: "13px 25px",
              borderRadius: "12px",
              background: "#0891b2",
              color: "#fff",
              fontWeight: "700",
            }}
          >
            ورود به حساب
          </Link>
        </div>
      </main>
    );
  }

  if (currentUser.role !== "ADMIN") {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: "#06111f",
          color: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
            width: "100%",
            background: "#0a1929",
            border: "1px solid #4a1d1d",
            borderRadius: "24px",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "45px" }}>🚫</div>

          <h1>دسترسی غیرمجاز</h1>

          <p style={{ color: "#94a3b8", lineHeight: 1.8 }}>
            این بخش فقط مخصوص مدیر سایت است.
          </p>

          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              marginTop: "18px",
              padding: "13px 25px",
              borderRadius: "12px",
              background: "#1e293b",
              color: "#fff",
              fontWeight: "700",
            }}
          >
            بازگشت به داشبورد
          </Link>
        </div>
      </main>
    );
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#06111f",
        color: "#f8fafc",
        padding: "30px 18px 60px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <header
          style={{
            background:
              "linear-gradient(135deg, #0a1d31, #081827)",
            border: "1px solid #17304a",
            borderRadius: "24px",
            padding: "28px",
            marginBottom: "24px",
          }}
        >
          <Link
            href="/admin"
            style={{
              color: "#22d3ee",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            ← بازگشت به پنل مدیریت
          </Link>

          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                color: "#22d3ee",
                fontSize: "13px",
                fontWeight: "800",
                marginBottom: "8px",
              }}
            >
              TRADING AI • USERS
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "800",
              }}
            >
              مدیریت کاربران
            </h1>

            <p
              style={{
                color: "#94a3b8",
                lineHeight: 1.8,
                marginBottom: 0,
              }}
            >
              مشاهده حساب‌ها، نقش‌ها و پلن کاربران پلتفرم
            </p>
          </div>
        </header>

        {/* Stats */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <StatCard
            icon="👥"
            title="کل کاربران"
            value={String(users.length)}
          />

          <StatCard
            icon="🛡️"
            title="مدیران"
            value={String(
              users.filter((user) => user.role === "ADMIN").length
            )}
          />

          <StatCard
            icon="🆓"
            title="پلن رایگان"
            value={String(
              users.filter((user) => user.plan === "FREE").length
            )}
          />
        </section>

        {/* Users */}
        <section
          style={{
            background: "#081827",
            border: "1px solid #142b40",
            borderRadius: "22px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                فهرست کاربران
              </h2>

              <p
                style={{
                  color: "#64748b",
                  margin: "7px 0 0",
                  fontSize: "13px",
                }}
              >
                جدیدترین کاربران در ابتدا نمایش داده می‌شوند.
              </p>
            </div>

            <div
              style={{
                background: "#09293b",
                color: "#22d3ee",
                borderRadius: "12px",
                padding: "10px 15px",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              {users.length} کاربر
            </div>
          </div>

          {users.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "#94a3b8",
              }}
            >
              <div
                style={{
                  fontSize: "40px",
                  marginBottom: "15px",
                }}
              >
                👥
              </div>

              <h3 style={{ color: "#f8fafc" }}>
                هنوز کاربری ثبت نشده است.
              </h3>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {users.map((user, index) => (
                <div
                  key={user.id}
                  style={{
                    background: "#0d1d2d",
                    border: "1px solid #172f44",
                    borderRadius: "18px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                          marginBottom: "7px",
                        }}
                      >
                        کاربر #{index + 1}
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                        }}
                      >
                        {user.name}
                      </h3>

                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: "14px",
                          marginTop: "8px",
                          wordBreak: "break-word",
                        }}
                      >
                        {user.email}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <Badge
                        text={user.role}
                        type={
                          user.role === "ADMIN"
                            ? "admin"
                            : "normal"
                        }
                      />

                      <Badge
                        text={user.plan}
                        type="plan"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "18px",
                      paddingTop: "15px",
                      borderTop: "1px solid #172f44",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    تاریخ عضویت:{" "}
                    {new Date(user.createdAt).toLocaleDateString(
                      "fa-IR"
                    )}
                  </div>

                  <UserActions
                    userId={user.id}
                    currentRole={user.role}
                    currentPlan={user.plan}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#081827",
        border: "1px solid #142b40",
        borderRadius: "20px",
        padding: "22px",
      }}
    >
      <div
        style={{
          fontSize: "28px",
          marginBottom: "15px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#94a3b8",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <strong style={{ fontSize: "27px" }}>
        {value}
      </strong>
    </div>
  );
}

function Badge({
  text,
  type,
}: {
  text: string;
  type: "admin" | "normal" | "plan";
}) {
  let background = "#132235";
  let color = "#cbd5e1";

  if (type === "admin") {
    background = "#123247";
    color = "#22d3ee";
  }

  if (type === "plan") {
    background = "#17253a";
    color = "#a5b4fc";
  }

  return (
    <span
      style={{
        display: "inline-block",
        background,
        color,
        borderRadius: "10px",
        padding: "7px 11px",
        fontSize: "12px",
        fontWeight: "700",
      }}
    >
      {text}
    </span>
  );
}
