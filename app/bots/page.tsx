export default function BotsPage() {
  const bots = [
    {
      name: "Gold AI Bot",
      market: "XAU/USD",
      strategy: "Trend Following",
      profit: "+12.5%",
      status: "فعال",
    },
    {
      name: "Crypto Smart Bot",
      market: "BTC/USDT",
      strategy: "AI Scalping",
      profit: "+8.2%",
      status: "فعال",
    },
    {
      name: "Forex Pro Bot",
      market: "EUR/USD",
      strategy: "Risk Control",
      profit: "+5.7%",
      status: "متوقف",
    },
  ];


  return (
    <main>

      <h1>
        مدیریت ربات‌ها
      </h1>

      <p>
        کنترل و بررسی عملکرد ربات‌های هوشمند معامله‌گر
      </p>



      <section>

        <h2>
          ربات‌های فعال
        </h2>


        {bots.map((bot, index) => (
          <div key={index}>

            <h3>
              {bot.name}
            </h3>

            <p>
              بازار: {bot.market}
            </p>

            <p>
              استراتژی: {bot.strategy}
            </p>

            <p>
              عملکرد: {bot.profit}
            </p>

            <p>
              وضعیت: {bot.status}
            </p>


            <button>
              مشاهده عملکرد
            </button>


            <button>
              تنظیمات ربات
            </button>


          </div>
        ))}


      </section>



      <section>

        <h2>
          کنترل ربات
        </h2>

        <p>
          🤖 روشن / خاموش کردن ربات‌ها
        </p>

        <p>
          📊 تغییر استراتژی معاملاتی
        </p>

        <p>
          ⚠️ تنظیم سطح ریسک
        </p>

      </section>



      <section>

        <h2>
          امنیت ربات‌ها
        </h2>

        <p>
          ✅ بررسی قبل از معامله
        </p>

        <p>
          ✅ توقف خودکار در شرایط خطرناک
        </p>

        <p>
          ✅ گزارش عملکرد روزانه
        </p>

      </section>


    </main>
  );
}
