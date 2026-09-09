export default function BotsPage() {
  const bots = [
    {
      name: "AI Crypto Bot",
      status: "Active",
      profit: "+12.5%",
      trades: 48,
    },
    {
      name: "Forex AI Bot",
      status: "Paused",
      profit: "+6.8%",
      trades: 22,
    },
    {
      name: "Gold Trading Bot",
      status: "Active",
      profit: "+9.4%",
      trades: 35,
    },
  ];

  return (
    <main>
      <h1>AI Trading Bots</h1>

      <p>
        مدیریت ربات‌های معامله‌گر هوش مصنوعی
      </p>

      {bots.map((bot, index) => (
        <section key={index}>
          <h2>{bot.name}</h2>

          <p>
            وضعیت: {bot.status}
          </p>

          <p>
            سود: {bot.profit}
          </p>

          <p>
            تعداد معاملات: {bot.trades}
          </p>
        </section>
      ))}
    </main>
  );
}
