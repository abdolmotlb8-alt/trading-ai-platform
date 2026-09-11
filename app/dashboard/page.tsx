import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {

  const user = await getCurrentUser();


  if (!user) {
    redirect("/login");
  }


  return (

    <main className="min-h-screen bg-black text-white p-8">


      <div className="rounded-3xl border border-yellow-500/20 bg-zinc-900 p-8">


        <h1 className="text-4xl font-bold text-yellow-400">
          داشبورد ABOK AI
        </h1>


        <h2 className="mt-6 text-2xl">
          خوش آمدید {user.name}
        </h2>


        <div className="mt-6 space-y-3 text-gray-300">

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

        </div>


      </div>



      <div className="mt-8 grid gap-6 md:grid-cols-3">


        <div className="rounded-3xl bg-zinc-900 p-6">
          🤖
          <h3 className="mt-3 text-xl text-yellow-400">
            ربات‌های من
          </h3>
          <p>
            مدیریت ربات‌های معاملاتی
          </p>
        </div>



        <div className="rounded-3xl bg-zinc-900 p-6">
          📈
          <h3 className="mt-3 text-xl text-yellow-400">
            معاملات
          </h3>
          <p>
            مشاهده معاملات و سود و زیان
          </p>
        </div>



        <div className="rounded-3xl bg-zinc-900 p-6">
          🧠
          <h3 className="mt-3 text-xl text-yellow-400">
            تحلیل AI
          </h3>
          <p>
            تحلیل بازار توسط هوش مصنوعی
          </p>
        </div>


      </div>


    </main>

  );
}
