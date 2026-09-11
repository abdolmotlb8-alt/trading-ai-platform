import Link from "next/link";


export default function Header() {

  return (

    <header className="header">

      <div className="container">

        <div className="flex items-center justify-between py-5">


          {/* Logo */}

          <Link
            href="/"
            className="text-3xl font-black text-cyan-600"
          >
            Trading AI
          </Link>




          {/* Menu */}

          <nav className="hidden md:flex items-center gap-8">

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





          {/* Buttons */}

          <div className="flex items-center gap-3">


            <Link

              href="/login"

              className="
              px-5
              py-3
              rounded-xl
              text-slate-700
              font-bold
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
              px-6
              py-3
              rounded-xl
              font-bold
              shadow-lg
              hover:scale-105
              transition
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
