import { getCurrentUser } from "@/lib/current-user";

export default async function ReportsPage() {

  const user = await getCurrentUser();


  if (!user) {

    return (

      <main>

        <h1>
          ورود لازم است
        </h1>

        <p>
          برای مشاهده گزارش‌ها ابتدا وارد حساب شوید.
        </p>

      </main>

    );

  }



  return (

    <main>


      <h1>
        کارنامه معاملات
      </h1>



      <section>

        <h2>
          اطلاعات حساب
        </h2>


        <p>
          کاربر: {user.name}
        </p>


        <p>
          پلن: {user.plan}
        </p>


      </section>



      <section>

        <h2>
          آمار کلی
        </h2>


        <p>
          تعداد معاملات: 0
        </p>


        <p>
          معاملات موفق: 0
        </p>


        <p>
          معاملات ناموفق: 0
        </p>


        <p>
          درصد موفقیت: 0%
        </p>


      </section>



      <section>

        <h2>
          سود و زیان
        </h2>


        <p>
          سود کل: 0 دلار
        </p>


        <p>
          ضرر کل: 0 دلار
        </p>


        <p>
          تبدیل به تومان در مرحله اتصال قیمت لحظه‌ای اضافه می‌شود.
        </p>


      </section>



      <section>

        <h2>
          گزارش دوره‌ای
        </h2>


        <p>
          گزارش روزانه
        </p>


        <p>
          گزارش هفتگی
        </p>


        <p>
          گزارش ماهانه
        </p>


      </section>



      <section>

        <h2>
          عملکرد ربات‌ها
        </h2>


        <p>
          بعداً عملکرد واقعی ربات‌های تحلیلگر و معامله‌گر اینجا نمایش داده می‌شود.
        </p>


      </section>


    </main>

  );

}
