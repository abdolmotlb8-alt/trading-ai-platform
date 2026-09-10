import { getCurrentUser } from "@/lib/current-user";

export default async function PaymentsPage() {

  const user = await getCurrentUser();


  return (

    <main>

      <h1>
        اشتراک و پرداخت
      </h1>


      {user && (

        <section>

          <h2>
            وضعیت حساب شما
          </h2>

          <p>
            کاربر: {user.name}
          </p>

          <p>
            پلن فعلی: {user.plan}
          </p>

        </section>

      )}



      <section>

        <h2>
          انتخاب پلن
        </h2>



        <div>

          <h3>
            پلن رایگان
          </h3>

          <p>
            دسترسی پایه به امکانات سایت
          </p>


        </div>



        <div>

          <h3>
            پلن VIP
          </h3>

          <p>
            دسترسی به سیگنال‌های ویژه و امکانات حرفه‌ای
          </p>


          <button>
            خرید VIP
          </button>


        </div>



        <div>

          <h3>
            پلن Premium
          </h3>

          <p>
            امکانات کامل شامل ابزارهای پیشرفته
          </p>


          <button>
            ارتقا حساب
          </button>


        </div>


      </section>



      <section>

        <h2>
          تاریخچه پرداخت‌ها
        </h2>


        <p>
          هنوز پرداختی ثبت نشده است.
        </p>


      </section>



    </main>

  );

}
