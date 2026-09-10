export default function AdminPage() {
  const users = [
    {
      name: "User One",
      plan: "VIP",
      status: "فعال",
    },
    {
      name: "User Two",
      plan: "Free",
      status: "فعال",
    },
    {
      name: "User Three",
      plan: "Premium",
      status: "غیرفعال",
    },
  ];


  return (
    <main>

      <h1>
        پنل مدیریت
      </h1>

      <p>
        مدیریت کاربران، پرداخت‌ها، ربات‌ها و سیستم هوش مصنوعی
      </p>



      <section>

        <h2>
          آمار سیستم
        </h2>

        <p>
          👥 تعداد کاربران: 1250
        </p>

        <p>
          💎 کاربران VIP: 320
        </p>

        <p>
          🤖 ربات‌های فعال: 85
        </p>

        <p>
          📊 معاملات امروز: 450
        </p>

      </section>



      <section>

        <h2>
          مدیریت کاربران
        </h2>


        {users.map((user, index) => (
          <div key={index}>

            <h3>
              {user.name}
            </h3>

            <p>
              اشتراک: {user.plan}
            </p>

            <p>
              وضعیت: {user.status}
            </p>


            <button>
              مشاهده کاربر
            </button>


          </div>
        ))}


      </section>



      <section>

        <h2>
          مدیریت خدمات
        </h2>

        <p>
          🤖 کنترل ربات‌های معاملاتی
        </p>

        <p>
          📈 مدیریت سیگنال‌ها
        </p>

        <p>
          🎓 مدیریت دوره‌ها
        </p>

        <p>
          💳 بررسی پرداخت‌ها
        </p>

      </section>



      <section>

        <h2>
          کنترل هوش مصنوعی
        </h2>

        <p>
          🧠 موتور تحلیل AI: فعال
        </p>

        <p>
          🔔 سیستم هشدار: فعال
        </p>

        <p>
          ⚙️ وضعیت سرورها: پایدار
        </p>

      </section>


    </main>
  );
}
