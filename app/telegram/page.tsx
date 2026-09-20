
"use client";

import { useState } from "react";

export default function TelegramPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function connectTelegram() {
    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/telegram/test", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (data.success) {
        setResult("✅ پیام آزمایشی با موفقیت به تلگرام ارسال شد.");
      } else {
        setResult(
          "❌ " + (data.error || "اتصال به تلگرام ناموفق بود.")
        );
      }
    } catch (error) {
      console.error("Telegram connection error:", error);
      setResult("❌ خطا در ارتباط با سرور سایت.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "30px 20px",
        color: "white",
      }}
    >
      <h1>📡 اتصال تلگرام</h1>

      <p>
        دریافت سیگنال‌ها، اخبار و گزارش معاملات از طریق تلگرام
      </p>

      <section
        style={{
          marginTop: "30px",
          padding: "25px",
          border: "1px solid #334155",
          borderRadius: "15px",
        }}
      >
        <h2>🔗 وضعیت اتصال</h2>

        <p>
          برای آزمایش اتصال سایت به ربات تلگرام، روی دکمه زیر
          کلیک کنید.
        </p>

        <button
          onClick={connectTelegram}
          disabled={loading}
          style={{
            padding: "12px 24px",
            borderRadius: "10px",
            border: "none",
            cursor: loading ? "wait" : "pointer",
            backgroundColor: loading ? "#64748b" : "#229ED9",
            color: "#ffffff",
            fontSize: "16px",
          }}
        >
          {loading ? "⏳ در حال اتصال..." : "🚀 اتصال تلگرام"}
        </button>

        {result && (
          <p
            style={{
              marginTop: "20px",
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "#0f172a",
            }}
          >
            {result}
          </p>
        )}
      </section>

      <section
        style={{
          marginTop: "25px",
          padding: "25px",
          border: "1px solid #334155",
          borderRadius: "15px",
        }}
      >
        <h2>🛠 خدمات تلگرام</h2>

        <p>✅ ارسال سیگنال‌های خرید و فروش</p>
        <p>✅ ارسال گزارش روزانه معاملات</p>
        <p>✅ هشدار اخبار مهم اقتصادی</p>
        <p>✅ ارسال اهداف و حد ضرر</p>
        <p>✅ دسترسی به کانال VIP</p>
        <p>✅ پشتیبانی و مدیریت اشتراک</p>
      </section>

      <section
        style={{
          marginTop: "25px",
          padding: "25px",
          border: "1px solid #334155",
          borderRadius: "15px",
        }}
      >
        <h2>📢 اطلاعات تلگرام</h2>

        <p>ربات تلگرام: آماده آزمایش اتصال</p>
        <p>کانال سیگنال: تنظیم‌شده در Environment</p>
        <p>وضعیت: منتظر آزمایش اتصال</p>
      </section>
    </main>
  );
}
