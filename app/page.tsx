export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">

      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6">
        <div className="text-3xl font-bold text-yellow-400">
          AI TRADE
        </div>

        <button className="bg-yellow-500 text-black px-6 py-3 rounded-full font-bold">
          شروع کنید
        </button>
      </header>


      {/* Hero */}
      <section className="text-center px-6 py-20">

        <h1 className="text-6xl font-black text-yellow-400">
          پلتفرم هوشمند معاملات
        </h1>

        <p className="mt-6 text-gray-300 text-xl max-w-3xl mx-auto">
          ربات‌های هوش مصنوعی برای تحلیل بازار،
          مدیریت سرمایه و تصمیم‌های معاملاتی حرفه‌ای
        </p>

        <div className="mt-10">
          <div className="mx-auto w-48 h-48 rounded-full bg-yellow-500/20 flex items-center justify-center text-7xl">
            🤖
          </div>
        </div>

      </section>



      {/* Cards */}
      <section className="grid md:grid-cols-3 gap-8 px-8 pb-20">


        <div className="bg-[#111] border border-yellow-500/30 rounded-3xl p-8">
          <div className="text-5xl mb-5">
            🤖
          </div>

          <h2 className="text-2xl text-yellow-400 font-bold">
            ربات معامله‌گر
          </h2>

          <p className="text-gray-400 mt-4">
            سیستم‌های هوشمند برای بررسی بازار و پیدا کردن فرصت‌ها.
          </p>
        </div>



        <div className="bg-[#111] border border-yellow-500/30 rounded-3xl p-8">

          <div className="text-5xl mb-5">
            📈
          </div>

          <h2 className="text-2xl text-yellow-400 font-bold">
            تحلیل پیشرفته
          </h2>

          <p className="text-gray-400 mt-4">
            تحلیل داده‌های بازار با الگوریتم‌های هوش مصنوعی.
          </p>

        </div>




        <div className="bg-[#111] border border-yellow-500/30 rounded-3xl p-8">

          <div className="text-5xl mb-5">
            🔒
          </div>

          <h2 className="text-2xl text-yellow-400 font-bold">
            امنیت بالا
          </h2>

          <p className="text-gray-400 mt-4">
            مدیریت امن حساب و اطلاعات کاربران.
          </p>

        </div>


      </section>



      {/* Footer */}

      <footer className="text-center py-10 text-gray-500">
        © 2026 AI TRADE Platform
      </footer>


    </main>
  )
}
body {
  background:#050505;
  font-family: Arial, sans-serif;
}


* {
  box-sizing:border-box;
}


button {
  transition:0.3s;
}


button:hover {
  transform:scale(1.05);
}
