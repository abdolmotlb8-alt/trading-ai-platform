export default function ReportsPage() {
  const trades = [
    {
      symbol: "XAU/USD",
      type: "BUY",
      profitDollar: "+20$",
      profitToman: "+4,000,000 تومان",
      result: "برد 🟢",
    },
    {
      symbol: "BTC/USDT",
      type: "SELL",
      profitDollar: "-10$",
      profitToman: "-2,000,000 تومان",
      result: "باخت 🔴",
    },
    {
      symbol: "EUR/USD",
      type: "BUY",
      profitDollar: "+15$",
      profitToman: "+3,000,000 تومان",
      result: "برد 🟢",
    },
  ];


  return (
    <main>

      <h1>
        کارنامه معاملات
      </h1>

      <p>
        گزارش کامل عملکرد ربات‌ها و سیگنال‌های معاملاتی
      </p>



      <section>

        <h2>
          خلاصه امروز
        </h2>

        <p>
          تعداد معاملات: 12
        </p>

        <p>
          معاملات موفق: 9 🟢
        </p>

        <p>
          معاملات ناموفق: 3 🔴
        </p>

        <p>
          سود خالص امروز: +140 دلار
        </p>

        <p>
          معادل تومان: +28,000,000 تومان
        </p>

      </section>



      <section>

        <h2>
          معاملات امروز
        </h2>


        {trades.map((trade, index) => (
          <div key={index}>

            <h3>
              {trade.symbol}
            </h3>

            <p>
              نوع: {trade.type}
            </p>

            <p>
              نتیجه: {trade.result}
            </p>

            <p>
              سود/ضرر دلاری: {trade.profitDollar}
            </p>

            <p>
              تبدیل تومان: {trade.profitToman}
            </p>


          </div>
        ))}


      </section>



      <section>

        <h2>
          گزارش ربات‌ها
        </h2>

        <p>
          🤖 Gold AI Bot: 85٪ موفقیت
        </p>

        <p>
          🤖 Crypto AI Bot: 72٪ موفقیت
        </p>

        <p>
          🤖 Forex Bot: 78٪ موفقیت
        </p>

      </section>



      <section>

        <h2>
          ارسال گزارش
        </h2>

        <p>
          📱 گزارش روزانه به تلگرام ارسال خواهد شد.
        </p>

        <p>
          ⏰ زمان ارسال: پایان روز معاملاتی
        </p>

      </section>


    </main>
  );
}
