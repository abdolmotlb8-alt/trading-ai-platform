export default function LoginPage() {
  return (
    <main>

      <h1>
        ورود به حساب کاربری
      </h1>

      <p>
        وارد حساب خود شوید و به خدمات Trading AI دسترسی پیدا کنید.
      </p>


      <section>

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
          placeholder="رمز عبور خود را وارد کنید"
        />


        <button>
          ورود
        </button>

      </section>


      <section>

        <p>
          حساب ندارید؟
        </p>

        <button>
          ثبت نام
        </button>

      </section>


    </main>
  );
}
