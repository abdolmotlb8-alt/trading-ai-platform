import Link from "next/link";


export default function Header() {

  return (

    <header className="w-full sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">

      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        <div className="flex items-center justify-between h-20">


          {/* Logo */}

          <Link
            href="/"
            className="
            text-2xl
            sm:text-3xl
            font-black
            text-cyan-600
            whitespace-nowrap
            "
          >
            Trading AI
          </Link>



          {/* Desktop Menu */}

          <nav
            className="
            hidden
            md:flex
            items-center
            gap-8
            text-slate-600
            font-semibold
            "
          >

            <Link
              href="/"
              className="hover:text-cyan-600 transition"
            >
              خانه
            </Link>


            <Link
              href="/market"
              className="hover:text-cyan-600 transition"
            >
              بازار
            </Link>


            <Link
              href="/signals"
              className="hover:text-cyan-600 transition"
            >
              سیگنال‌ها
            </Link>


            <Link
              href="/bots"
              className="hover:text-cyan-600 transition"
            >
              ربات‌ها
            </Link>


            <Link
              href="/ai-analysis"
              className="hover:text-cyan-600 transition"
            >
              تحلیل AI
            </Link>


          </nav>





          {/* Actions */}

          <div className="flex items-center gap-2">


            <Link

              href="/login"

              className="
              hidden
              sm:block
              px-4
              py-2.5
              rounded-xl
              font-bold
              text-slate-700
              hover:text-cyan-600
              transition
              "

            >
              ورود
            </Link>





            <Link

              href="/register"

              className="
              bg-gradient-to-r
              from-cyan-500
              to-blue-600
              text-white
              px-4
              sm:px-6
              py-2.5
              rounded-xl
              font-bold
              shadow-lg
              shadow-cyan-500/20
              hover:scale-105
              transition
              whitespace-nowrap
              "

            >
              شروع رایگان
            </Link>



          </div>


        </div>


      </div>


    </header>

  );

}
