import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main>

      <Navbar />

      <section>
        <h1>
          Trading AI Platform
        </h1>

        <p>
          پلتفرم هوشمند تحلیل بازار، سیگنال و مدیریت معاملات
        </p>
      </section>

      <section>
        <h2>
          امکانات ما
        </h2>

        <div>
          <h3>
            🤖 AI Analyst
          </h3>
          <p>
            تحلیل هوشمند بازارهای مالی
          </p>
        </div>

        <div>
          <h3>
            📊 Trading Signals
          </h3>
          <p>
            سیگنال‌های فارکس، کریپتو و طلا
          </p>
        </div>

        <div>
          <h3>
            ⚡ Trading Bots
          </h3>
          <p>
            ربات‌های تحلیلگر و معامله‌گر
          </p>
        </div>

      </section>

      <section>
        <h2>
          بازارها
        </h2>

        <p>
          Forex | Crypto | Gold
        </p>
      </section>

    </main>
  );
}
