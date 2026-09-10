export default function AIAnalysisPage() {
  const analyses = [
    {
      market: "XAU/USD",
      trend: "صعودی",
      confidence: "85%",
      support: "$2420",
      resistance: "$2480",
    },
    {
      market: "BTC/USDT",
      trend: "خنثی",
      confidence: "72%",
      support: "$60000",
      resistance: "$65000",
    },
    {
      market: "EUR/USD",
      trend: "نزولی",
      confidence: "78%",
      support: "1.0800",
      resistance: "1.0950",
    },
  ];


  return (
    <main>

      <h1>
        تحلیل هوش مصنوعی بازار
      </h1>

      <p>
        تحلیل خودکار بازارهای مالی با استفاده از هوش مصنوعی
      </p>



      <section>

        <h2>
          تحلیل‌های امروز
        </h2>


        {analyses.map((item, index) => (
          <div key={index}>

            <h3>
              {item.market}
            </h3>

            <p>
              روند: {item.trend}
            </p>

            <p>
              میزان اطمینان AI: {item.confidence}
            </p>

            <p>
              حمایت: {item.support}
            </p>

            <p>
              مقاومت: {item.resistance}
            </p>


            <button>
              مشاهده تحلیل کامل
            </button>

          </div>
        ))}


      </section>



      <section>

        <h2>
          پیشنهاد هوش مصنوعی
        </h2>

        <p>
          قبل از هر معامله، شرایط بازار، خبرها و میزان ریسک بررسی می‌شود.
        </p>

      </section>



      <section>

        <h2>
          وضعیت سیستم AI
        </h2>

        <p>
          🤖 موتور تحلیل: فعال
        </p>

        <p>
          📊 بررسی بازارها: فعال
        </p>

        <p>
          🔔 هشدارهای هوشمند: آماده
        </p>

      </section>


    </main>
  );
}
