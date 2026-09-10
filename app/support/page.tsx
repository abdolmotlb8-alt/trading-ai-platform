import { getCurrentUser } from "@/lib/current-user";

export default async function SupportPage() {

  const user = await getCurrentUser();


  if (!user) {

    return (

      <main>

        <h1>
          ورود لازم است
        </h1>

        <p>
          برای استفاده از پشتیبانی ابتدا وارد حساب شوید.
        </p>

      </main>

    );

  }



  return (

    <main>


      <h1>
        پشتیبانی کاربران
      </h1>



      <section>

        <h2>
          ارسال درخواست جدید
        </h2>


        <textarea

          placeholder="پیام خود را بنویسید"

        />



        <button>

          ارسال پیام

        </button>


      </section>



      <section>

        <h2>
          درخواست‌های من
        </h2>


        <p>
          هنوز درخواستی ثبت نشده است.
        </p>


      </section>



      <section>

        <h2>
          راه‌های ارتباطی
        </h2>


        <p>
          پشتیبانی تلگرام در مرحله بعد اضافه خواهد شد.
        </p>


      </section>



    </main>

  );

}
