import { getCurrentUser } from "@/lib/current-user";

export default async function DashboardPage() {

  const user = await getCurrentUser();


  if (!user) {

    return (

      <main>

        <h1>
          ورود لازم است
        </h1>

        <p>
          لطفاً ابتدا وارد حساب خود شوید.
        </p>

      </main>

    );

  }



  return (

    <main>


      <h1>
        داشبورد کاربر
      </h1>



      <section>

        <h2>
          خوش آمدید {user.name}
        </h2>

        <p>
          ایمیل: {user.email}
        </p>

        <p>
          نقش: {user.role}
        </p>

        <p>
          پلن: {user.plan}
        </p>

      </section>



      <section>

        <h2>
          سیگنال‌های معاملاتی
        </h2>

        <p>
          هنوز سیگنالی ثبت نشده است.
        </p>

      </section>



      <section>

        <h2>
          معاملات من
        </h2>

        <p>
          لیست معاملات در این بخش نمایش داده می‌شود.
        </p>

      </section>



      <section>

        <h2>
          گزارش سود و زیان
        </h2>

        <p>
          مجموع سود و ضرر معاملات اینجا نمایش داده خواهد شد.
        </p>

      </section>



      <section>

        <h2>
          وضعیت ربات‌ها
        </h2>

        <p>
          ربات‌های فعال و عملکرد آنها اینجا قرار می‌گیرد.
        </p>

      </section>


    </main>

  );

}
