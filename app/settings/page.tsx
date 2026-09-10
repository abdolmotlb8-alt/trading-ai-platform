import { getCurrentUser } from "@/lib/current-user";

export default async function SettingsPage() {

  const user = await getCurrentUser();


  if (!user) {

    return (

      <main>

        <h1>
          ورود لازم است
        </h1>

        <p>
          برای مشاهده تنظیمات ابتدا وارد حساب شوید.
        </p>

      </main>

    );

  }



  return (

    <main>


      <h1>
        تنظیمات حساب
      </h1>



      <section>

        <h2>
          اطلاعات کاربر
        </h2>


        <p>
          نام: {user.name}
        </p>


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
          امنیت
        </h2>


        <button>
          تغییر رمز عبور
        </button>


        <p>
          مدیریت ورودها و امنیت حساب در این بخش قرار می‌گیرد.
        </p>


      </section>



      <section>

        <h2>
          اعلان‌ها
        </h2>


        <p>
          تنظیم دریافت پیام‌ها و هشدارهای معاملاتی
        </p>


      </section>



      <section>

        <h2>
          اتصال‌ها
        </h2>


        <p>
          اتصال تلگرام و سرویس‌های دیگر در این بخش اضافه خواهد شد.
        </p>


      </section>



    </main>

  );

}
