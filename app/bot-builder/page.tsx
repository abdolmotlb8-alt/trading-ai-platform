export default function BotBuilderPage() {
  const bots = [
    {
      name: "Gold AI Bot",
      market: "XAU/USD",
      strategy: "Trend Following",
      status: "فعال",
    },
    {
      name: "Crypto AI Bot",
      market: "BTC/USDT",
      strategy: "Smart Trading",
      status: "آماده",
    },
  ];


  return (
    <main>

      <h1>
        ساخت و مدیریت ربات
      </h1>

      <p>
        ساخت ربات‌های هوشمند برای تحلیل و مدیریت معاملات
      </p>



      <section>

        <h2>
          ساخت ربات جدید
        </h2>


        <label>
          نام ربات
        </label>

        <input
          type="text"
          placeholder="نام ربات"
        />


        <label>
          بازار
        </label>

        <select>

          <option>
            Gold
          </option>

          <option>
            Forex
          </option>

          <option>
            Crypto
          </option>

        </select>


        <label>
          استراتژی
        </label>

        <select>

          <option>
            Trend Following
          </option>

          <option>
            Scalping
          </option>

          <option>
            AI Strategy
          </option>

        </select>


        <button>
          ساخت ربات
        </button>


      </section>



      <section>

        <h2>
          ربات‌های من
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
              وضعیت: {bot.status}
            </p>


            <button>
              مدیریت ربات
            </button>


          </div>
        ))}


      </section>



      <section>

        <h2>
          تنظیمات امنیتی
        </h2>


        <p>
          ✅ کنترل ریسک قبل از معامله
        </p>

        <p>
          ✅ توقف خودکار در شرایط خطرناک
        </p>

        <p>
          ✅ گزارش عملکرد ربات
        </p>


      </section>


    </main>
  );
}
