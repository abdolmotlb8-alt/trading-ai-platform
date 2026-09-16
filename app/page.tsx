"use client";

import { useState } from "react";

export default function HomePage() {
  const [showSupport, setShowSupport] = useState(false);

  return (
    <main className="site">
      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">T</div>
          <span>Trading AI</span>
        </div>

        <div className="nav-links">
          <a href="#features">امکانات</a>
          <a href="#about">درباره ما</a>
          <button
            className="support-link"
            onClick={() => setShowSupport(true)}
          >
            پشتیبانی
          </button>
        </div>

        <div className="auth-buttons">
          <a href="/login" className="login-btn">
            ورود
          </a>
          <a href="/register" className="register-btn">
            ثبت‌نام
          </a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="badge">
            <span className="dot"></span>
            هوشمندتر معامله کن
          </div>

          <h1>
            تصمیم‌های معاملاتی
            <br />
            <span>هوشمندتر با Trading AI</span>
          </h1>

          <p>
            تحلیل بازار، سیگنال‌های معاملاتی و ابزارهای هوشمند
            <br />
            در یک محیط ساده و حرفه‌ای.
          </p>

          <div className="hero-actions">
            <a href="/register" className="primary-btn">
              شروع کنید
              <span>←</span>
            </a>

            <a href="/login" className="secondary-btn">
              ورود به حساب
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="section-title">
          <span>امکانات</span>
          <h2>همه‌چیز در یک محیط ساده</h2>
        </div>

        <div className="cards">
          <div className="feature-card">
            <div className="feature-icon">◈</div>
            <h3>تحلیل هوشمند</h3>
            <p>
              داده‌های بازار را بررسی کنید و اطلاعات موردنیاز خود را
              سریع‌تر پیدا کنید.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">↗</div>
            <h3>سیگنال‌های معاملاتی</h3>
            <p>
              سیگنال‌ها و اطلاعات معاملاتی را در یک داشبورد مرتب مشاهده کنید.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">◉</div>
            <h3>داشبورد حرفه‌ای</h3>
            <p>
              محیطی ساده و کاربردی برای مدیریت اطلاعات و فعالیت‌های شما.
            </p>
          </div>
        </div>
      </section>

      <section id="about" className="about">
        <div className="about-box">
          <div>
            <span className="small-title">TRADING AI</span>
            <h2>شروع یک تجربه متفاوت</h2>
            <p>
              حساب خود را ایجاد کنید و از ابزارهای Trading AI در یک محیط
              ساده و حرفه‌ای استفاده کنید.
            </p>
          </div>

          <a href="/register" className="about-btn">
            ساخت حساب
          </a>
        </div>
      </section>

      <footer>
        <div className="footer-brand">Trading AI</div>
        <p>© 2026 Trading AI — تمامی حقوق محفوظ است.</p>

        <button onClick={() => setShowSupport(true)}>
          تماس با پشتیبانی
        </button>
      </footer>

      {showSupport && (
        <div
          className="modal-overlay"
          onClick={() => setShowSupport(false)}
        >
          <div
            className="support-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
              onClick={() => setShowSupport(false)}
            >
              ×
            </button>

            <div className="feature-icon">?</div>

            <h2>پشتیبانی Trading AI</h2>

            <p>
              اگر مشکلی دارید یا به راهنمایی نیاز دارید، با تیم پشتیبانی
              در ارتباط باشید.
            </p>

            <a href="mailto:support@example.com" className="primary-btn full">
              ارسال پیام
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
