export default function SupportPage() {
  return (
    <main>

      <h1>
        پشتیبانی کاربران
      </h1>

      <p>
        سوالات و مشکلات خود را برای تیم پشتیبانی ارسال کنید.
      </p>


      <section>

        <h2>
          ارسال پیام جدید
        </h2>


        <label>
          موضوع
        </label>

        <input
          type="text"
          placeholder="موضوع پیام"
        />


        <label>
          پیام شما
        </label>

        <textarea
          placeholder="متن پیام خود را بنویسید"
        />


        <button>
          ارسال پیام
        </button>

      </section>



      <section>

        <h2>
          وضعیت تیکت‌ها
        </h2>

        <p>
          هنوز تیکتی ثبت نشده است.
        </p>

      </section>


    </main>
  );
}
