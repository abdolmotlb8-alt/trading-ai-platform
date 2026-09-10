import { getCurrentUser } from "@/lib/current-user";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main>
        <h1>ورود لازم است</h1>
        <p>برای مشاهده پنل مدیریت ابتدا وارد حساب خود شوید.</p>
      </main>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <main>
        <h1>دسترسی غیرمجاز</h1>
        <p>شما اجازه ورود به پنل مدیریت را ندارید.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>پنل مدیریت</h1>

      <p>
        خوش آمدید {user.name}
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

      <section>
        <h2>مدیریت کاربران</h2>
        <p>
          مشاهده و مدیریت کاربران، VIP و پلن‌ها
        </p>
      </section>

      <section>
        <h2>مدیریت معاملات</h2>
        <p>
          بررسی معاملات و عملکرد ربات‌ها
        </p>
      </section>

      <section>
        <h2>گزارش‌ها</h2>
        <p>
          بررسی سود، ضرر و عملکرد روزانه
        </p>
      </section>
    </main>
  );
}
