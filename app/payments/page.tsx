export default function PaymentsPage() {
  const plans = [
    {
      name: "Free",
      price: "0 USDT",
      features: "دسترسی محدود",
    },
    {
      name: "VIP",
      price: "30 USDT",
      features: "سیگنال + ربات + آموزش",
    },
    {
      name: "Premium",
      price: "100 USDT",
      features: "تمام امکانات حرفه‌ای",
    },
  ];


  const transactions = [
    {
      title: "خرید اشتراک VIP",
      amount: "30 USDT",
      status: "موفق",
    },
    {
      title: "تمدید اشتراک",
      amount: "30 USDT",
      status: "در انتظار",
    },
  ];


  return (
    <main>

      <h1>
        پرداخت و اشتراک
      </h1>

      <p>
        مدیریت خرید اشتراک و تراکنش‌های حساب کاربری
      </p>



      <section>

        <h2>
          پلن‌های اشتراک
        </h2>


        {plans.map((plan, index) => (
          <div key={index}>

            <h3>
              {plan.name}
            </h3>

            <p>
              قیمت: {plan.price}
            </p>

            <p>
              امکانات: {plan.features}
            </p>


            <button>
              خرید اشتراک
            </button>


          </div>
        ))}


      </section>



      <section>

        <h2>
          روش پرداخت
        </h2>

        <p>
          💳 کارت بانکی
        </p>

        <p>
          🪙 ارز دیجیتال USDT
        </p>

        <p>
          🔗 پرداخت آنلاین
        </p>


      </section>



      <section>

        <h2>
          تاریخچه تراکنش‌ها
        </h2>


        {transactions.map((item, index) => (
          <div key={index}>

            <h3>
              {item.title}
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
          امنیت پرداخت
        </h2>

        <p>
          ✅ ثبت تراکنش‌ها
        </p>

        <p>
          ✅ تایید پرداخت
        </p>

        <p>
          ✅ محافظت از اطلاعات کاربر
        </p>

      </section>


    </main>
  );
}
