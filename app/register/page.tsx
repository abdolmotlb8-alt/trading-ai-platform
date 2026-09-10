export default function RegisterPage() {
  return (
    <main>

      <h1>
        ثبت نام
      </h1>

      <p>
        ساخت حساب کاربری برای استفاده از خدمات Trading AI
      </p>


      <section>

        <label>
          نام کاربر
        </label>

        <input
          type="text"
          placeholder="نام خود را وارد کنید"
        />


        <label>
          ایمیل
        </label>

        <input
          type="email"
          placeholder="ایمیل خود را وارد کنید"
        />


        <label>
          رمز عبور
        </label>

        <input
          type="password"
          placeholder="رمز عبور"
        />


        <button>
          ایجاد حساب
        </button>

      </section>


      <section>

        <p>
          با ثبت نام، به داشبورد، سیگنال‌ها و خدمات ویژه دسترسی خواهید داشت.
        </p>

      </section>


    </main>
  );
}
