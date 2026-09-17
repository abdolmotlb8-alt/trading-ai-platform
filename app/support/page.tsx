import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

export default async function SupportPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100vh",
          padding: "70px 20px",
          background:
            "radial-gradient(circle at top right, rgba(34,211,238,.13), transparent 32%), #06101e",
          color: "#f8fafc",
          fontFamily: "Arial, Tahoma, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "650px",
            margin: "0 auto",
            padding: "45px 28px",
            textAlign: "center",
            borderRadius: "28px",
            background: "rgba(15,23,42,.78)",
            border: "1px solid rgba(148,163,184,.13)",
          }}
        >
          <div style={{ fontSize: "55px", marginBottom: "18px" }}>
            🔐
          </div>

          <h1 style={{ fontSize: "32px", margin: "0 0 15px" }}>
            پشتیبانی Trading AI
          </h1>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: 2,
              marginBottom: "28px",
            }}
          >
            برای استفاده از مرکز پشتیبانی ابتدا وارد حساب کاربری خود شوید.
          </p>

          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 28px",
              borderRadius: "14px",
              background: "#22d3ee",
              color: "#04121e",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            ورود به حساب
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
        padding: "28px 16px 70px",
        background:
          "radial-gradient(circle at top right, rgba(34,211,238,.12), transparent 30%), radial-gradient(circle at bottom left, rgba(37,99,235,.10), transparent 30%), #06101e",
        color: "#f8fafc",
        fontFamily: "Arial, Tahoma, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>

        {/* Header */}
        <section
          style={{
            padding: "28px",
            borderRadius: "26px",
            background: "rgba(15,23,42,.75)",
            border: "1px solid rgba(148,163,184,.13)",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "8px 14px",
              borderRadius: "999px",
              background: "rgba(34,211,238,.08)",
              border: "1px solid rgba(34,211,238,.18)",
              color: "#67e8f9",
              fontSize: "12px",
              marginBottom: "14px",
            }}
          >
            ✦ TRADING AI SUPPORT
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(30px, 6vw, 46px)",
            }}
          >
            مرکز پشتیبانی
          </h1>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: 2,
              margin: "12px 0 0",
            }}
          >
            سلام {user.name} 👋
            <br />
            از این بخش می‌توانید مشکلات، سوالات و درخواست‌های خود را مدیریت
            کنید.
          </p>
        </section>

        {/* Support options */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              background:
                "linear-gradient(145deg, rgba(8,47,73,.75), rgba(15,23,42,.82))",
              border: "1px solid rgba(34,211,238,.14)",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                background: "rgba(34,211,238,.09)",
                fontSize: "25px",
                marginBottom: "16px",
              }}
            >
              🎫
            </div>

            <h2 style={{ margin: "0 0 10px", fontSize: "21px" }}>
              ارسال درخواست
            </h2>

            <p
              style={{
                color: "#94a3b8",
                lineHeight: 1.9,
                fontSize: "13px",
                margin: 0,
              }}
            >
              اگر مشکلی دارید، می‌توانید درخواست پشتیبانی ایجاد کنید.
            </p>

            <button
              type="button"
              style={{
                width: "100%",
                minHeight: "46px",
                marginTop: "20px",
                border: 0,
                borderRadius: "13px",
                background: "#22d3ee",
                color: "#04121e",
                fontWeight: 800,
              }}
            >
              ایجاد تیکت
            </button>
          </div>

          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              background: "rgba(15,23,42,.75)",
              border: "1px solid rgba(148,163,184,.12)",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                background: "rgba(34,197,94,.08)",
                fontSize: "25px",
                marginBottom: "16px",
              }}
            >
              💬
            </div>

            <h2 style={{ margin: "0 0 10px", fontSize: "21px" }}>
              گفت‌وگو با پشتیبانی
            </h2>

            <p
              style={{
                color: "#94a3b8",
                lineHeight: 1.9,
                fontSize: "13px",
                margin: 0,
              }}
            >
              سیستم گفت‌وگوی مستقیم با تیم پشتیبانی در مرحله بعد فعال می‌شود.
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "11px",
                borderRadius: "12px",
                textAlign: "center",
                background: "rgba(148,163,184,.06)",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              به‌زودی
            </div>
          </div>

          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              background: "rgba(15,23,42,.75)",
              border: "1px solid rgba(148,163,184,.12)",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                background: "rgba(250,204,21,.08)",
                fontSize: "25px",
                marginBottom: "16px",
              }}
            >
              📚
            </div>

            <h2 style={{ margin: "0 0 10px", fontSize: "21px" }}>
              سوالات متداول
            </h2>

            <p
              style={{
                color: "#94a3b8",
                lineHeight: 1.9,
                fontSize: "13px",
                margin: 0,
              }}
            >
              پاسخ سوالات متداول درباره حساب، ربات‌ها، بازار و بروکر.
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "11px",
                borderRadius: "12px",
                textAlign: "center",
                background: "rgba(148,163,184,.06)",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              در حال آماده‌سازی
            </div>
          </div>
        </section>

        {/* Ticket area */}
        <section
          style={{
            padding: "26px",
            borderRadius: "26px",
            background: "rgba(15,23,42,.75)",
            border: "1px solid rgba(148,163,184,.12)",
            marginBottom: "22px",
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
              <h2 style={{ margin: 0, fontSize: "23px" }}>
                درخواست‌های من
              </h2>

              <p
                style={{
                  color: "#64748b",
                  margin: "8px 0 0",
                  fontSize: "13px",
                }}
              >
                درخواست‌های پشتیبانی شما در این بخش نمایش داده می‌شوند.
              </p>
            </div>

            <span
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                background: "rgba(34,211,238,.08)",
                color: "#67e8f9",
                fontSize: "12px",
              }}
            >
              0 درخواست فعال
            </span>
          </div>

          <div
            style={{
              padding: "35px 20px",
              textAlign: "center",
              borderRadius: "18px",
              background: "#0b1929",
              border: "1px dashed rgba(148,163,184,.15)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>
              📭
            </div>

            <strong style={{ display: "block", fontSize: "17px" }}>
              هنوز درخواستی ثبت نشده است
            </strong>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                margin: "9px 0 0",
              }}
            >
              در صورت نیاز، یک درخواست جدید ایجاد کنید.
            </p>
          </div>
        </section>

        {/* Help cards */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          <Link
            href="/bots"
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: "rgba(15,23,42,.72)",
              border: "1px solid rgba(148,163,184,.12)",
              color: "white",
              textDecoration: "none",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>
              🤖
            </div>

            <h3 style={{ margin: "0 0 7px" }}>
              مشکل ربات‌ها؟
            </h3>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                margin: 0,
              }}
            >
              مشاهده بخش مدیریت ربات‌ها
            </p>
          </Link>

          <Link
            href="/broker"
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: "rgba(15,23,42,.72)",
              border: "1px solid rgba(148,163,184,.12)",
              color: "white",
              textDecoration: "none",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>
              🔗
            </div>

            <h3 style={{ margin: "0 0 7px" }}>
              مشکل اتصال بروکر؟
            </h3>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                margin: 0,
              }}
            >
              مشاهده تنظیمات اتصال بروکر
            </p>
          </Link>

          <Link
            href="/dashboard"
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: "rgba(15,23,42,.72)",
              border: "1px solid rgba(148,163,184,.12)",
              color: "white",
              textDecoration: "none",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>
              🏠
            </div>

            <h3 style={{ margin: "0 0 7px" }}>
              بازگشت به داشبورد
            </h3>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                margin: 0,
              }}
            >
              بازگشت به مرکز مدیریت حساب
            </p>
          </Link>
        </section>

      </div>
    </main>
  );
}
