export default function EconomicPage() {
  const events = [
    {
      country: "🇺🇸 آمریکا",
      event: "تصمیم نرخ بهره بانک مرکزی",
      time: "18:00",
      impact: "High",
      market: "Forex / Gold",
    },
    {
      country: "🇬🇧 انگلستان",
      event: "گزارش تورم",
      time: "14:30",
      impact: "Medium",
      market: "GBP",
    },
    {
      country: "🇯🇵 ژاپن",
      event: "گزارش اقتصادی",
      time: "09:00",
      impact: "Low",
      market: "JPY",
    },
  ];


  return (
    <main>

      <h1>
        تقویم اقتصادی
      </h1>

      <p>
        مشاهده اخبار و رویدادهای مهم اقتصادی بازارهای جهانی
      </p>


      <section>

        <h2>
          رویدادهای امروز
        </h2>


        {events.map((event, index) => (
          <div key={index}>

            <h3>
              {event.country}
            </h3>

            <p>
              خبر: {event.event}
            </p>

            <p>
              ساعت: {event.time}
            </p>

            <p>
              اهمیت: {event.impact}
            </p>

            <p>
              بازار تاثیرپذیر: {event.market}
            </p>


          </div>
        ))}


      </section>



      <section>

        <h2>
          هشدار خبر
        </h2>

        <p>
          سیستم در آینده قبل از خبرهای مهم به کاربران اعلان ارسال می‌کند.
        </p>

      </section>



      <section>

        <h2>
          سشن‌های معاملاتی
        </h2>

        <p>
          🌏 آسیا: فعال
        </p>

        <p>
          🇬🇧 لندن: فعال
        </p>

        <p>
          🇺🇸 نیویورک: فعال
        </p>

      </section>


    </main>
  );
}
