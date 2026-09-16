import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-container">

        {/* Header */}
        <header className="dashboard-header">

          <div className="brand">
            <div className="brand-icon">
              AI
            </div>

            <div className="brand-text">
              <h1>Trading AI</h1>
              <p>
                پلتفرم هوشمند معاملات و تحلیل بازار
              </p>
            </div>
          </div>

          <div className="user-badge">

            <div className="user-avatar">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="user-info">
              <span className="user-name">
                {user.name}
              </span>

              <span className="user-plan">
                پلن {user.plan}
              </span>
            </div>

          </div>

        </header>

        {/* Main Layout */}
        <div className="dashboard-grid">

          {/* Sidebar */}
          <aside className="dashboard-sidebar">

            <div className="sidebar-title">
              منوی اصلی
            </div>

            <nav className="sidebar-menu">

              <Link
                href="/dashboard"
                className="sidebar-link active"
              >
                <span className="sidebar-icon">⌂</span>
                داشبورد
              </Link>

              <Link
                href="/bots"
                className="sidebar-link"
              >
                <span className="sidebar-icon">🤖</span>
                ربات‌های من
              </Link>

              <Link
                href="/market"
                className="sidebar-link"
              >
                <span className="sidebar-icon">📈</span>
                بازار
              </Link>

              <Link
                href="/ai-analysis"
                className="sidebar-link"
              >
                <span className="sidebar-icon">🧠</span>
                تحلیل هوش مصنوعی
              </Link>

              <Link
                href="/broker"
                className="sidebar-link"
              >
                <span className="sidebar-icon">🔗</span>
                اتصال بروکر
              </Link>

              <Link
                href="/courses"
                className="sidebar-link"
              >
                <span className="sidebar-icon">🎓</span>
                آموزش
              </Link>

              <Link
                href="/support"
                className="sidebar-link"
              >
                <span className="sidebar-icon">💬</span>
                پشتیبانی
              </Link>

            </nav>

          </aside>

          {/* Content */}
          <section className="dashboard-main">

            {/* Welcome */}
            <div className="welcome-section">

              <h2>
                خوش آمدید، {user.name} 👋
              </h2>

              <p>
                از این بخش می‌توانید حساب، ربات‌ها،
                تحلیل‌ها و سرویس‌های معاملاتی خود را مدیریت کنید.
              </p>

            </div>

            {/* Stats */}
            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-label">
                  وضعیت حساب
                </div>

                <div className="stat-value">
                  فعال
                </div>

                <div className="stat-sub">
                  حساب شما فعال است
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  پلن فعلی
                </div>

                <div className="stat-value">
                  {user.plan}
                </div>

                <div className="stat-sub">
                  پلن حساب کاربری
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  ربات‌ها
                </div>

                <div className="stat-value">
                  ۰
                </div>

                <div className="stat-sub">
                  هنوز رباتی متصل نشده
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  بروکر
                </div>

                <div className="stat-value">
                  متصل نیست
                </div>

                <div className="stat-sub">
                  آماده اتصال
                </div>
              </div>

            </div>

            {/* Content */}
            <div className="content-grid">

              {/* Account */}
              <div className="panel">

                <div className="panel-header">

                  <div>
                    <h3 className="panel-title">
                      اطلاعات حساب
                    </h3>

                    <p className="panel-description">
                      اطلاعات فعلی حساب کاربری شما
                    </p>
                  </div>

                </div>

                <div className="account-list">

                  <div className="account-row">
                    <span className="account-label">
                      نام کاربر
                    </span>

                    <span className="account-value">
                      {user.name}
                    </span>
                  </div>

                  <div className="account-row">
                    <span className="account-label">
                      ایمیل
                    </span>

                    <span className="account-value">
                      {user.email}
                    </span>
                  </div>

                  <div className="account-row">
                    <span className="account-label">
                      نقش
                    </span>

                    <span className="account-value">
                      {user.role}
                    </span>
                  </div>

                  <div className="account-row">
                    <span className="account-label">
                      پلن
                    </span>

                    <span className="account-value">
                      {user.plan}
                    </span>
                  </div>

                  <div className="account-row">

                    <span className="account-label">
                      وضعیت
                    </span>

                    <span className="account-value status">
                      <span className="status-dot" />
                      فعال
                    </span>

                  </div>

                </div>

              </div>

              {/* Services */}
              <div className="panel">

                <div className="panel-header">

                  <div>
                    <h3 className="panel-title">
                      مرکز معامله‌گری
                    </h3>

                    <p className="panel-description">
                      سرویس‌های اصلی پلتفرم
                    </p>
                  </div>

                </div>

                <div className="service-grid">

                  <Link
                    href="/bots"
                    className="service-card"
                  >
                    <div className="service-icon">
                      🤖
                    </div>

                    <h4 className="service-title">
                      ربات معاملاتی
                    </h4>

                    <p className="service-text">
                      ساخت و مدیریت ربات‌های معاملاتی
                    </p>
                  </Link>

                  <Link
                    href="/ai-analysis"
                    className="service-card"
                  >
                    <div className="service-icon">
                      🧠
                    </div>

                    <h4 className="service-title">
                      تحلیل AI
                    </h4>

                    <p className="service-text">
                      تحلیل هوشمند بازار و دارایی‌ها
                    </p>
                  </Link>

                  <Link
                    href="/broker"
                    className="service-card"
                  >
                    <div className="service-icon">
                      🔗
                    </div>

                    <h4 className="service-title">
                      اتصال بروکر
                    </h4>

                    <p className="service-text">
                      اتصال امن حساب معاملاتی
                    </p>
                  </Link>

                  <Link
                    href="/support"
                    className="service-card"
                  >
                    <div className="service-icon">
                      💬
                    </div>

                    <h4 className="service-title">
                      پشتیبانی
                    </h4>

                    <p className="service-text">
                      ارتباط با تیم پشتیبانی Trading AI
                    </p>
                  </Link>

                </div>

              </div>

            </div>

          </section>

        </div>

      </div>
    </main>
  );
}
