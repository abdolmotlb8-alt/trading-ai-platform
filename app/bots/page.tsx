import { getCurrentUser } from "@/lib/current-user";

export default async function BotsPage() {

  const user = await getCurrentUser();


  if (!user) {

    return (

      <main>

        <h1>
          ورود لازم است
        </h1>

        <p>
          برای مشاهده ربات‌ها ابتدا وارد حساب شوید.
        </p>

      </main>

    );

  }



  return (

    <main>


      <h1>
        ربات‌های من
      </h1>



      <section>

        <h2>
          وضعیت حساب
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
          ربات تحلیلگر
        </h2>


        <p>
          وضعیت:
          آماده برای اتصال سیستم تحلیل بازار
        </p>


      </section>



      <section>

        <h2>
          ربات معامله‌گر
        </h2>


        <p>
          وضعیت:
          پس از تست و اتصال صرافی فعال خواهد شد.
        </p>


      </section>



      <section>

        <h2>
          عملکرد ربات‌ها
        </h2>


        <p>
          گزارش سود، ضرر و معاملات در این بخش نمایش داده می‌شود.
        </p>


      </section>


    </main>

  );

}
