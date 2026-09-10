export default function NewsPage() {
  const news = [
    {
      title: "تصمیم بانک مرکزی آمریکا",
      market: "Forex / Gold",
      impact: "High",
    },
    {
      title: "حرکت بزرگ بازار کریپتو",
      market: "Crypto",
      impact: "Medium",
    },
    {
      title: "گزارش اقتصادی مهم امروز",
      market: "Global Market",
      impact: "High",
    },
  ];


  return (
    <main>

      <h1>
        اخبار و تقویم اقتصادی
      </h1>

      <p>
        بررسی خبرهای مهم بازارهای مالی و زمان‌های حساس معامله‌گری
      </p>


      <section>

        <h2>
          اخبار مهم
        </h2>


        {news.map((item, index) => (
          <div key={index}>

            <h3>
              {item.title}
            </h3>

            <p>
              بازار: {item.market}
            </p>

            <p>
              اهمیت خبر: {item.impact}
            </p>

          </div>
        ))}


      </section>



      <section>

        <h2>
          سشن‌های معاملاتی
        </h2>


        <p>
          🌏 آسیا: شروع فعالیت بازار
        </p>


        <p>
          🇬🇧 لندن: حجم بالای معاملات فارکس
        </p>


        <p>
          🇺🇸 نیویورک: بیشترین نوسان بازار
        </p>


      </section>



      <section>

        <h2>
          هشدار اقتصادی
        </h2>


        <p>
          سیستم در آینده قبل از اخبار مهم به کاربران هشدار می‌دهد.
        </p>


      </section>


    </main>
  );
}
