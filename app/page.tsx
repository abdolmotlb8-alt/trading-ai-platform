import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <div className="text-3xl font-black text-cyan-600">
            Trading AI
          </div>


          <nav className="hidden md:flex gap-8 text-sm font-semibold">

            <Link href="/">
              خانه
            </Link>

            <Link href="/market">
              بازار
            </Link>

            <Link href="/signals">
              سیگنال‌ها
            </Link>

            <Link href="/bots">
              ربات‌ها
            </Link>

            <Link href="/ai-analysis">
              تحلیل AI
            </Link>

          </nav>


          <Link
            href="/login"
            className="bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-cyan-600"
          >
            ورود
          </Link>

        </div>
      </header>



      {/* Hero */}

      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">


        <div className="text-right">


          <h1 className="text-5xl md:text-6xl font-black leading-tight">

            معامله هوشمند
            <br />

            با قدرت
            <span className="text-cyan-600">
              هوش مصنوعی
            </span>

          </h1>



          <p className="mt-8 text-xl text-slate-600 leading-9">

            پلتفرم حرفه‌ای تحلیل بازار، سیگنال هوشمند،
            ربات معامله‌گر و ابزارهای پیشرفته AI برای معامله‌گران مدرن.

          </p>



          <div className="mt-10 flex gap-5 justify-end">


            <Link
              href="/register"
              className="bg-cyan-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg"
            >
              شروع رایگان
            </Link>


            <Link
              href="/ai-analysis"
              className="border border-slate-300 px-8 py-4 rounded-2xl font-bold"
            >
              مشاهده AI
            </Link>


          </div>


        </div>



        {/* AI Card */}

        <div className="bg-white rounded-3xl shadow-xl p-8 border">


          <div className="bg-slate-100 rounded-2xl p-6">

            <div className="text-cyan-600 text-5xl">
              🤖
            </div>


            <h3 className="text-2xl font-bold mt-5">
              AI Market Engine
            </h3>


            <p className="text-slate-600 mt-4">
              تحلیل لحظه‌ای بازار با الگوریتم‌های هوشمند.
            </p>


            <div className="mt-8 grid grid-cols-3 gap-4">


              <div className="bg-white rounded-xl p-4 text-center">
                <b>98%</b>
                <p>AI</p>
              </div>


              <div className="bg-white rounded-xl p-4 text-center">
                <b>24/7</b>
                <p>Online</p>
              </div>


              <div className="bg-white rounded-xl p-4 text-center">
                <b>AI</b>
                <p>Bot</p>
              </div>


            </div>


          </div>


        </div>


      </section>





      {/* Features */}

      <section className="max-w-7xl mx-auto px-6 py-20">


        <h2 className="text-4xl font-black text-center">
          امکانات حرفه‌ای Trading AI
        </h2>


        <div className="grid md:grid-cols-3 gap-8 mt-14">


          {[
            {
              icon:"📈",
              title:"تحلیل بازار",
              text:"بررسی لحظه‌ای بازارهای مالی با AI"
            },

            {
              icon:"⚡",
              title:"سیگنال هوشمند",
              text:"دریافت فرصت‌های معاملاتی"
            },

            {
              icon:"🤖",
              title:"ربات معامله‌گر",
              text:"اجرای معاملات خودکار"
            }

          ].map((item)=>(
            
            <div
              key={item.title}
              className="bg-white p-8 rounded-3xl shadow-md border hover:shadow-xl transition"
            >

              <div className="text-5xl">
                {item.icon}
              </div>


              <h3 className="text-2xl font-bold mt-6">
                {item.title}
              </h3>


              <p className="text-slate-600 mt-4">
                {item.text}
              </p>


            </div>

          ))}


        </div>


      </section>





      {/* Statistics */}

      <section className="bg-white py-20">


        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-8 text-center">


          <div>
            <h3 className="text-4xl font-black text-cyan-600">
              50K+
            </h3>
            <p>
              کاربران
            </p>
          </div>


          <div>
            <h3 className="text-4xl font-black text-cyan-600">
              24/7
            </h3>
            <p>
              تحلیل
            </p>
          </div>


          <div>
            <h3 className="text-4xl font-black text-cyan-600">
              AI
            </h3>
            <p>
              تکنولوژی
            </p>
          </div>


          <div>
            <h3 className="text-4xl font-black text-cyan-600">
              Pro
            </h3>
            <p>
              ابزارها
            </p>
          </div>


        </div>


      </section>






      {/* Footer CTA */}

      <section className="max-w-6xl mx-auto px-6 py-24">


        <div className="bg-cyan-600 rounded-3xl p-12 text-white text-center">


          <h2 className="text-4xl font-black">
            آینده معاملات با AI شروع شده است
          </h2>


          <p className="mt-5 text-lg">
            همین امروز حساب رایگان بسازید.
          </p>


          <Link
            href="/register"
            className="inline-block mt-8 bg-white text-cyan-600 px-10 py-4 rounded-xl font-bold"
          >
            ثبت نام
          </Link>


        </div>


      </section>


    </main>
  );
}
