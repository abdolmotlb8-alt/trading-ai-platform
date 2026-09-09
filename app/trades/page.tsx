export default function TradesPage() {
  const trades = [
    {
      symbol: "XAU/USD",
      type: "BUY",
      result: "WIN",
      profit: "+2.5%",
      date: "Today",
    },
    {
      symbol: "BTC/USDT",
      type: "SELL",
      result: "LOSS",
      profit: "-1.2%",
      date: "Yesterday",
    },
    {
      symbol: "EUR/USD",
      type: "BUY",
      result: "WIN",
      profit: "+1.8%",
      date: "This Week",
    },
  ];

  return (
    <main>

      <h1>
        تاریخچه معاملات
      </h1>

      <p>
        گزارش معاملات، سود و ضرر و عملکرد ربات‌ها
      </p>


      {trades.map((trade, index) => (
        <section key={index}>

          <h2>
            {trade.symbol}
          </h2>

          <p>
            نوع معامله: {trade.type}
          </p>

          <p>
            نتیجه: {trade.result}
          </p>

          <p>
            سود/ضرر: {trade.profit}
          </p>

          <p>
            تاریخ: {trade.date}
          </p>

        </section>
      ))}


    </main>
  );
}
