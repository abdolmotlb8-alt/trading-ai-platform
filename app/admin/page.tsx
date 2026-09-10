import { hasAccess } from "@/lib/auth";


export default function AdminPage() {


  const userRole = "ADMIN";


  const access = hasAccess(
    userRole,
    "ADMIN"
  );



  if (!access) {

    return (

      <main>

        <h1>
          دسترسی غیرمجاز
        </h1>

        <p>
          شما اجازه ورود به پنل مدیریت را ندارید.
        </p>

      </main>

    );

  }



  return (

    <main>

      <h1>
        پنل مدیریت
      </h1>


      <p>
        خوش آمدید مدیر سایت
      </p>


      <section>

        <h2>
          مدیریت کاربران
        </h2>

        <p>
          مشاهده کاربران، VIP و تنظیمات
        </p>

      </section>



      <section>

        <h2>
          مدیریت معاملات
        </h2>

        <p>
          بررسی گزارش‌ها و عملکرد ربات‌ها
        </p>

      </section>


    </main>

  );

}
