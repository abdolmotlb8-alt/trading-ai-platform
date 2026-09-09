export default function SignalsPage() {
  const signals = [
    {
      name: "BTC/USDT",
      type: "BUY",
      price: "$62,500",
      confidence: "92%",
    },
    {
      name: "ETH/USDT",
      type: "SELL",
      price: "$3,200",
      confidence: "85%",
    },
    {
      name: "SOL/USDT",
      type: "BUY",
      price: "$145",
      confidence: "88%",
    },
  ];

  return (
    <div>
      <h1>AI Trading Signals</h1>

      {signals.map((signal, index) => (
        <div key={index}>
          <h2>{signal.name}</h2>
          <p>Signal: {signal.type}</p>
          <p>Price: {signal.price}</p>
          <p>Confidence: {signal.confidence}</p>
        </div>
      ))}
    </div>
  );
}
