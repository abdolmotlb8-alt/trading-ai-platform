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
          پلتفرم هوشمند تحلیل بازار، سیگنال و مدیریت معاملات
        </p>
      </section>

      <section>
        <h2>
          امکانات ما
        </h2>

        <div>
          <h3>
            🤖 ربات های هوش مصنوعی
          </h3>
          <p>
            تحلیل بازار و کمک به تصمیم‌گیری معاملاتی
          </p>
        </div>

        <div>
          <h3>
            📊 سیگنال های معاملاتی
          </h3>
          <p>
            فارکس، کریپتو و طلا
          </p>
        </div>

        <div>
          <h3>
            ⚡ ربات معامله‌گر
          </h3>
          <p>
            مدیریت معاملات خودکار در آینده
          </p>
        </div>
      </section>

      <MobileMenu />

    </main>
  );
}
