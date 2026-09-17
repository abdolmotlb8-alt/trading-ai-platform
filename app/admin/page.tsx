import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
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
          padding: "30px 18px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            background: "#0a1929",
            border: "1px solid #17304a",
            borderRadius: "24px",
            padding: "40px 28px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "18px" }}>
            🔐
          </div>

          <h1 style={{ margin: 0, fontSize: "25px" }}>
            ورود لازم است
          </h1>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: 1.9,
              marginTop: "14px",
            }}
          >
            برای ورود به پنل مدیریت ابتدا وارد حساب کاربری خود شوید.
          </p>

          <Link
            href="/login"
            style={{
              display: "inline-block",
              marginTop: "18px",
              padding: "13px 26px",
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

  if (user.role !== "ADMIN") {
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
          padding: "30px 18px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            background: "#0a1929",
            border: "1px solid #4a1d1d",
            borderRadius: "24px",
            padding: "40px 28px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "18px" }}>
            🚫
          </div>

          <h1 style={{ margin: 0, fontSize: "25px" }}>
            دسترسی غیرمجاز
          </h1>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: 1.9,
              marginTop: "14px",
            }}
          >
            این بخش فقط برای مدیر سایت قابل دسترسی است.
          </p>

          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              marginTop: "18px",
              padding: "13px 26px",
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

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#06111f",
        color: "#f8fafc",
        padding: "30px 18px 70px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            background:
              "linear-gradient(135deg, #0a1d31, #081827)",
            border: "1px solid #17304a",
            borderRadius: "24px",
            padding: "28px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#22d3ee",
                  fontSize: "13px",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  marginBottom: "8px",
                }}
              >
                TRADING AI • ADMIN PANEL
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: "800",
                }}
              >
                پنل مدیریت Trading AI
              </h1>

              <p
                style={{
                  color: "#94a3b8",
                  lineHeight: 1.8,
                  margin: "10px 0 0",
                }}
              >
                مدیریت کاربران، اشتراک‌ها، ربات‌ها، گزارش‌ها و پشتیبانی
              </p>
            </div>

            <div
              style={{
                background: "#082536",
                border: "1px solid #16465b",
                borderRadius: "16px",
                padding: "15px 22px",
                minWidth: "130px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  marginBottom: "6px",
                }}
              >
                سطح دسترسی
              </div>

              <strong
                style={{
                  color: "#22d3ee",
                  fontSize: "18px",
                }}
              >
                ADMIN
              </strong>
            </div>
          </div>
        </header>

        <section
          style={{
            background: "#081827",
            border: "1px solid #142b40",
            borderRadius: "22px",
            padding: "24px",
            marginBottom: "22px",
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              fontSize: "20px",
            }}
          >
            👤 حساب مدیر
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <InfoBox title="نام" value={user.name} />
            <InfoBox title="ایمیل" value={user.email} />
            <InfoBox title="نقش" value={user.role} />
            <InfoBox title="پلن" value={user.plan} />
          </div>
        </section>

        <section>
          <div style={{ marginBottom: "18px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
              }}
            >
              مدیریت پلتفرم
            </h2>

            <p
              style={{
                color: "#64748b",
                margin: "8px 0 0",
              }}
            >
              دسترسی سریع به بخش‌های مدیریتی سایت
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(270px, 1fr))",
              gap: "18px",
            }}
          >
            <AdminCard
              href="/admin/users"
              icon="👥"
              title="مدیریت کاربران"
              description="مشاهده کاربران و مدیریت نقش و پلن حساب‌ها"
            />

            <AdminCard
              href="/admin/plans"
              icon="💎"
              title="مدیریت اشتراک‌ها"
              description="مدیریت پلن‌های رایگان، VIP، Premium و Lifetime"
            />

            <AdminCard
              href="/admin/reports"
              icon="📊"
              title="گزارش‌ها"
              description="مشاهده گزارش فعالیت و عملکرد پلتفرم"
            />

            <AdminCard
              href="/admin/bots"
              icon="🤖"
              title="مدیریت ربات‌ها"
              description="مدیریت و بررسی ربات‌های معامله‌گر"
            />

            <AdminCard
              href="/support"
              icon="🎧"
              title="پشتیبانی"
              description="مشاهده و مدیریت درخواست‌های پشتیبانی کاربران"
            />

            <AdminCard
              href="/dashboard"
              icon="🏠"
              title="داشبورد اصلی"
              description="بازگشت به داشبورد کاربری Trading AI"
            />
          </div>
        </section>

        <section
          style={{
            marginTop: "22px",
            background: "#081827",
            border: "1px solid #142b40",
            borderRadius: "22px",
            padding: "24px",
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              fontSize: "20px",
            }}
          >
            وضعیت سیستم
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
            }}
          >
            <StatusBox title="سیستم" value="فعال" />
            <StatusBox title="احراز هویت" value="فعال" />
            <StatusBox title="سطح دسترسی" value="ADMIN" />
            <StatusBox
              title="ربات‌های معاملاتی"
              value="در حال توسعه"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#0d1d2d",
        border: "1px solid #172f44",
        borderRadius: "15px",
        padding: "18px",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <strong
        style={{
          fontSize: "15px",
          wordBreak: "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function AdminCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        background: "#081827",
        border: "1px solid #142b40",
        borderRadius: "20px",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "15px",
          background: "#09293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "25px",
          marginBottom: "18px",
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "19px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          color: "#94a3b8",
          lineHeight: 1.8,
          margin: 0,
          minHeight: "52px",
        }}
      >
        {description}
      </p>

      <div
        style={{
          color: "#22d3ee",
          fontSize: "13px",
          fontWeight: "700",
          marginTop: "18px",
        }}
      >
        ورود به بخش ←
      </div>
    </Link>
  );
}

function StatusBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#0d1d2d",
        border: "1px solid #172f44",
        borderRadius: "15px",
        padding: "18px",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <strong
        style={{
          color: "#22d3ee",
          fontSize: "15px",
        }}
      >
        ● {value}
      </strong>
    </div>
  );
}
