export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-yellow-500/20">
        <h1 className="text-3xl font-bold text-yellow-400">
          ABOK AI
        </h1>

        <button className="rounded-full bg-yellow-400 px-6 py-3 font-bold text-black">
          شروع معامله
        </button>
      </header>


      {/* Hero */}
      <section className="px-6 py-20 text-center">

        <h2 className="text-5xl md:text-6xl font-black text-yellow-400">
          بروکر هوشمند نسل جدید
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-300">
          پلتفرم هوش مصنوعی برای تحلیل بازار،
          مدیریت سرمایه و معاملات حرفه‌ای
        </p>


        <div className="mx-auto mt-12 flex h-48 w-48 items-center justify-center rounded-full border border-yellow-400/40 bg-yellow-400/10 text-7xl">
          🤖
        </div>

      </section>



      {/* Features */}
      <section className="grid gap-8 px-8 pb-20 md:grid-cols-3">


        <div className="rounded-3xl border border-yellow-400/20 bg-zinc-900 p-8">

          <div className="text-5xl">
            🤖
          </div>

          <h3 className="mt-5 text-2xl font-bold text-yellow-400">
            ربات AI
          </h3>

          <p className="mt-3 text-gray-400">
            تحلیل بازار با هوش مصنوعی و کمک به تصمیم‌های معاملاتی.
          </p>

        </div>



        <div className="rounded-3xl border border-yellow-400/20 bg-zinc-900 p-8">

          <div className="text-5xl">
            📈
          </div>

          <h3 className="mt-5 text-2xl font-bold text-yellow-400">
            معاملات حرفه‌ای
          </h3>

          <p className="mt-3 text-gray-400">
            محیط مدرن برای مدیریت سفارش‌ها و مشاهده بازار.
          </p>

        </div>



        <div className="rounded-3xl border border-yellow-400/20 bg-zinc-900 p-8">

          <div className="text-5xl">
            🔐
          </div>

          <h3 className="mt-5 text-2xl font-bold text-yellow-400">
            امنیت
          </h3>

          <p className="mt-3 text-gray-400">
            طراحی شده با تمرکز روی امنیت کاربران و داده‌ها.
          </p>

        </div>


      </section>



      {/* About */}

      <section className="px-8 pb-20">

        <div className="rounded-3xl border border-yellow-400/20 bg-zinc-900 p-10 text-center">

          <h3 className="text-3xl font-bold text-yellow-400">
            آینده معاملات با ABOK
          </h3>

          <p className="mt-5 text-gray-300">
            یک اکوسیستم هوشمند برای معامله‌گران،
            تحلیل‌گران و کاربران بازارهای مالی.
          </p>

        </div>

      </section>



      {/* Footer */}

      <footer className="border-t border-yellow-400/20 py-8 text-center text-gray-500">

        © 2026 ABOK AI Platform

      </footer>


    </main>
  );
}
