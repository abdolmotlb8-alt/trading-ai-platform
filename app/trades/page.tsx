export default function TradesPage() {
  const trades = [
    {
      symbol: "XAU/USD",
      type: "BUY",
      volume: "0.10",
      result: "+25 USDT",
      status: "بسته شده",
    },
    {
      symbol: "BTC/USDT",
      type: "BUY",
      volume: "0.05",
      result: "+80 USDT",
      status: "باز",
    },
    {
      symbol: "EUR/USD",
      type: "SELL",
      volume: "0.20",
      result: "-15 USDT",
      status: "بسته شده",
    },
  ];


  return (
    <main>

      <h1>
        مدیریت معاملات
      </h1>

      <p>
        مشاهده و مدیریت معاملات انجام شده توسط کاربر و سیستم AI
      </p>



      <section>

        <h2>
          معاملات اخیر
        </h2>


        {trades.map((trade, index) => (
          <div key={index}>

            <h3>
              {trade.symbol}
            </h3>

            <p>
              نوع معامله: {trade.type}
            </p>

            <p>
              حجم: {trade.volume}
            </p>

            <p>
              نتیجه: {trade.result}
            </p>

            <p>
              وضعیت: {trade.status}
            </p>


            <button>
              مشاهده جزئیات
            </button>


          </div>
        ))}


      </section>



      <section>

        <h2>
          خلاصه عملکرد
        </h2>

        <p>
          تعداد معاملات امروز: 12
        </p>

        <p>
          معاملات موفق: 9
        </p>

        <p>
          معاملات ناموفق: 3
        </p>

        <p>
          سود خالص امروز: +90 USDT
        </p>

      </section>



      <section>

        <h2>
          کنترل معامله
        </h2>

        <p>
          ✅ مدیریت حد ضرر
        </p>

        <p>
          ✅ مدیریت حد سود
        </p>

        <p>
          ✅ بررسی ریسک قبل از معامله
        </p>

      </section>


    </main>
  );
}
