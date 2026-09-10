import Navbar from "@/components/Navbar";
import MobileMenu from "@/components/MobileMenu";

export default function Home() {
  return (
    <main>

      <Navbar />


      <section>

        <h1>
          Trading AI Platform
        </h1>

        <p>
          پلتفرم هوشمند تحلیل و معامله‌گری در بازارهای فارکس، کریپتو و طلا
        </p>

        <button>
          شروع رایگان
        </button>

      </section>



      <section>

        <h2>
          چرا Trading AI؟
        </h2>


        <div>

          <h3>
            🤖 ربات‌های هوش مصنوعی
          </h3>

          <p>
            ربات‌های تحلیلگر و معامله‌گر برای بررسی بازار و مدیریت معاملات
          </p>

        </div>



        <div>

          <h3>
            📊 سیگنال‌های حرفه‌ای
          </h3>

          <p>
            دریافت سیگنال خرید و فروش با درصد ریسک و تحلیل بازار
          </p>

        </div>



        <div>

          <h3>
            📈 گزارش عملکرد
          </h3>

          <p>
            مشاهده سود، ضرر، وین ریت و تاریخچه معاملات
          </p>

        </div>



        <div>

          <h3>
            📱 اتصال هوشمند
          </h3>

          <p>
            اتصال به تلگرام و مدیریت خدمات کاربران
          </p>

        </div>


      </section>




      <section>

        <h2>
          بازارهای قابل پشتیبانی
        </h2>


        <p>
          🥇 Gold (XAU/USD)
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
          خدمات ویژه کاربران
        </h2>


        <p>
          دوره‌های آموزشی، کانال VIP، ربات‌های اختصاصی و پشتیبانی کاربران
        </p>


        <button>
          ثبت نام و شروع
        </button>


      </section>



      <MobileMenu />

    </main>
  );
}
