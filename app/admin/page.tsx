import { getCurrentUser } from "@/lib/current-user";

export default async function AdminPage() {

  const user = await getCurrentUser();


  if (!user) {

    return (

      <main>

        <h1>
          ورود لازم است
        </h1>

        <p>
          ابتدا وارد حساب مدیریت شوید.
        </p>

      </main>

    );

  }



  if (user.role !== "ADMIN") {

    return (

      <main>

        <h1>
          دسترسی غیرمجاز
        </h1>

        <p>
          این بخش فقط مخصوص مدیر سایت است.
        </p>

      </main>

    );

  }



  return (

    <main>


      <h1>
        پنل مدیریت سایت
      </h1>



      <section>

        <h2>
          اطلاعات مدیر
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


      </section>




      <section>

        <h2>
          مدیریت کاربران
        </h2>


        <p>
          مشاهده کاربران، تغییر نقش‌ها و مدیریت حساب‌ها
        </p>


      </section>




      <section>

        <h2>
          مدیریت اشتراک‌ها
        </h2>


        <p>
          مدیریت پلن رایگان، VIP و Premium
        </p>


      </section>




      <section>

        <h2>
          معاملات و گزارش‌ها
        </h2>


        <p>
          مشاهده عملکرد معاملات و کارنامه‌ها
        </p>


      </section>




      <section>

        <h2>
          ربات‌های معامله‌گر
        </h2>


        <p>
          مدیریت و بررسی ربات‌ها در مرحله بعد اضافه می‌شود.
        </p>


      </section>



    </main>

  );

}
