export default function MarketPage() {
  const markets = [
    {
      name: "XAU/USD",
      title: "Gold",
      price: "$2,450",
      change: "+0.8%",
    },
    {
      name: "BTC/USDT",
      title: "Bitcoin",
      price: "$62,000",
      change: "+1.4%",
    },
    {
      name: "EUR/USD",
      title: "Euro / Dollar",
      price: "1.0850",
      change: "-0.3%",
    },
    {
      name: "ETH/USDT",
      title: "Ethereum",
      price: "$3,200",
      change: "+0.9%",
    },
  ];


  return (
    <main>

      <h1>
        Market Watch
      </h1>

      <p>
        مشاهده وضعیت بازارهای مالی و تغییرات قیمت
      </p>



      <section>

        <h2>
          بازارها
        </h2>


        {markets.map((market, index) => (
          <div key={index}>

            <h3>
              {market.title}
            </h3>

            <p>
              نماد: {market.name}
            </p>

            <p>
              قیمت: {market.price}
            </p>

            <p>
              تغییرات: {market.change}
            </p>

            <button>
              افزودن به علاقه‌مندی ⭐
            </button>

          </div>
        ))}


      </section>



      <section>

        <h2>
          هشدار قیمت
        </h2>

        <p>
          در آینده کاربران می‌توانند برای قیمت‌ها هشدار تنظیم کنند.
        </p>

      </section>


    </main>
  );
}
