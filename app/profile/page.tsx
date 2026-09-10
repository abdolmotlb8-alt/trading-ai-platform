import { getCurrentUser } from "@/lib/current-user";

export default async function ProfilePage() {

  const user = await getCurrentUser();


  if (!user) {

    return (

      <main>

        <h1>
          ورود لازم است
        </h1>

        <p>
          برای مشاهده پروفایل ابتدا وارد حساب شوید.
        </p>

      </main>

    );

  }



  return (

    <main>


      <h1>
        پروفایل کاربر
      </h1>



      <section>

        <h2>
          اطلاعات حساب
        </h2>


        <p>
          نام:
          {user.name}
        </p>


        <p>
          ایمیل:
          {user.email}
        </p>


        <p>
          نقش:
          {user.role}
        </p>


        <p>
          پلن:
          {user.plan}
        </p>


      </section>



      <section>

        <h2>
          وضعیت اشتراک
        </h2>


        <p>
          نوع حساب: {user.plan}
        </p>


        <p>
          امکانات فعال بعداً در این بخش نمایش داده می‌شود.
        </p>


      </section>



      <section>

        <h2>
          امنیت حساب
        </h2>


        <p>
          تغییر رمز عبور
        </p>


        <p>
          مدیریت نشست‌های ورود
        </p>


      </section>


    </main>

  );

}
