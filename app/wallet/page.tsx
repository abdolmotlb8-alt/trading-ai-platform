export default function WalletPage() {
  const transactions = [
    {
      type: "شارژ حساب",
      amount: "+100 USDT",
      status: "موفق",
    },
    {
      type: "اشتراک VIP",
      amount: "-30 USDT",
      status: "پرداخت شده",
    },
    {
      type: "برداشت",
      amount: "-50 USDT",
      status: "در انتظار",
    },
  ];


  return (
    <main>

      <h1>
        کیف پول کاربر
      </h1>

      <p>
        مدیریت موجودی، پرداخت‌ها و تراکنش‌های حساب
      </p>



      <section>

        <h2>
          موجودی فعلی
        </h2>

        <p>
          موجودی: 520 USDT
        </p>

        <button>
          شارژ کیف پول
        </button>

        <button>
          برداشت وجه
        </button>

      </section>



      <section>

        <h2>
          وضعیت حساب
        </h2>

        <p>
          وضعیت VIP: فعال
        </p>

        <p>
          اعتبار حساب: تایید شده
        </p>

      </section>



      <section>

        <h2>
          تاریخچه تراکنش‌ها
        </h2>


        {transactions.map((item, index) => (
          <div key={index}>

            <h3>
              {item.type}
            </h3>

            <p>
              مبلغ: {item.amount}
            </p>

            <p>
              وضعیت: {item.status}
            </p>

          </div>
        ))}


      </section>



      <section>

        <h2>
          امنیت کیف پول
        </h2>

        <p>
          ✅ تایید دو مرحله‌ای
        </p>

        <p>
          ✅ محافظت از تراکنش‌ها
        </p>

        <p>
          ✅ ثبت کامل تاریخچه پرداخت
        </p>

      </section>


    </main>
  );
}
