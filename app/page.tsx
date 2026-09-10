import Link from "next/link";

export default function Home() {
  return (
    <main>

      <section>

        <h1>
          Trading AI Platform
        </h1>

        <p>
          پلتفرم هوشمند تحلیل بازار، سیگنال، ربات معامله‌گر و مدیریت معاملات
        </p>


        <Link href="/dashboard">
          <button>
            ورود به داشبورد
          </button>
        </Link>


        <Link href="/subscription">
          <button>
            شروع اشتراک VIP
          </button>
        </Link>

      </section>



      <section>

        <h2>
          امکانات هوشمند ما
        </h2>


        <div>

          <h3>
            🤖 AI Analysis
          </h3>

          <p>
            تحلیل بازار با هوش مصنوعی و بررسی روندها
          </p>

        </div>



        <div>

          <h3>
            📊 Trading Signals
          </h3>

          <p>
            دریافت سیگنال‌های فارکس، طلا و کریپتو
          </p>

        </div>



        <div>

          <h3>
            ⚡ Trading Bots
          </h3>

          <p>
            ربات‌های هوشمند برای مدیریت معاملات
          </p>

        </div>


      </section>



      <section>

        <h2>
          بازارهای تحت پوشش
        </h2>

        <p>
          🥇 Gold
        </p>

        <p>
          💱 Forex
        </p>

        <p>
          🪙 Crypto
        </p>


      </section>



      <section>

        <h2>
          چرا Trading AI؟
        </h2>


        <p>
          ✅ تحلیل ۲۴ ساعته بازار
        </p>


        <p>
          ✅ مدیریت ریسک هوشمند
        </p>


        <p>
          ✅ دستیار هوش مصنوعی
        </p>


        <p>
          ✅ ربات‌های معاملاتی قابل تنظیم
        </p>


      </section>



      <section>

        <h2>
          شروع کنید
        </h2>

        <p>
          حساب خود را بسازید و وارد دنیای معامله‌گری هوشمند شوید.
        </p>


        <Link href="/register">
          <button>
            ثبت‌نام
          </button>
        </Link>


        <Link href="/login">
          <button>
            ورود
          </button>
        </Link>


      </section>


    </main>
  );
}
