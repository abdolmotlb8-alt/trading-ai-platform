export default function SignalsPage() {
  const signals = [
    {
      symbol: "XAU/USD",
      type: "BUY",
      entry: "2440",
      stop: "2425",
      target: "2480",
      confidence: "88%",
      status: "فعال",
    },
    {
      symbol: "BTC/USDT",
      type: "BUY",
      entry: "62000",
      stop: "60000",
      target: "66000",
      confidence: "76%",
      status: "در حال بررسی",
    },
    {
      symbol: "EUR/USD",
      type: "SELL",
      entry: "1.0900",
      stop: "1.0950",
      target: "1.0800",
      confidence: "81%",
      status: "فعال",
    },
  ];


  return (
    <main>

      <h1>
        سیگنال‌های معاملاتی
      </h1>

      <p>
        سیگنال‌های تحلیل شده توسط سیستم هوش مصنوعی
      </p>



      <section>

        <h2>
          آخرین سیگنال‌ها
        </h2>


        {signals.map((signal, index) => (
          <div key={index}>

            <h3>
              {signal.symbol}
            </h3>

            <p>
              نوع معامله: {signal.type}
            </p>

            <p>
              نقطه ورود: {signal.entry}
            </p>

            <p>
              حد ضرر: {signal.stop}
            </p>

            <p>
              حد سود: {signal.target}
            </p>

            <p>
              اطمینان AI: {signal.confidence}
            </p>

            <p>
              وضعیت: {signal.status}
            </p>


            <button>
              مشاهده تحلیل کامل
            </button>


          </div>
        ))}


      </section>



      <section>

        <h2>
          فیلتر سیگنال‌ها
        </h2>

        <p>
          🥇 طلا
        </p>

        <p>
          💱 فارکس
        </p>

        <p>
          🪙 کریپتو
        </p>

      </section>



      <section>

        <h2>
          هشدار سیگنال
        </h2>

        <p>
          سیستم قبل از ورودهای مهم، اعلان ارسال می‌کند.
        </p>

      </section>


    </main>
  );
}
