import Link from "next/link";

export default function Home() {

  return (

    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}

      <header className="border-b border-yellow-600/30 bg-black/90">

        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">

          <h1 className="text-3xl font-bold text-yellow-400">
            ABOK AI
          </h1>


          <nav className="hidden md:flex gap-8 text-gray-300">

            <Link href="/">
              خانه
            </Link>

            <Link href="/market">
              بازار
            </Link>

            <Link href="/bots">
              ربات‌ها
            </Link>

            <Link href="/courses">
              آموزش
            </Link>

            <Link href="/support">
              پشتیبانی
            </Link>

          </nav>



          <div className="flex gap-3">

            <Link
            href="/login"
            className="
            border border-yellow-500
            text-yellow-400
            px-5 py-2
            rounded-xl
            hover:bg-yellow-500
            hover:text-black
            "
            >

              ورود

            </Link>


            <Link
            href="/register"
            className="
            bg-yellow-500
            text-black
            px-5 py-2
            rounded-xl
            font-bold
            hover:bg-yellow-400
            "
            >

              ثبت نام

            </Link>

          </div>


        </div>


      </header>





      {/* HERO */}


      <section className="max-w-6xl mx-auto px-6 py-24 text-center">


        <div
        className="
        bg-zinc-900
        border
        border-yellow-600/30
        rounded-3xl
        p-12
        shadow-2xl
        "
        >


          <h2
          className="
          text-5xl
          md:text-7xl
          font-black
          text-yellow-400
          mb-8
          "
          >

            معامله‌گری هوشمند با هوش مصنوعی


          </h2>


          <p
          className="
          text-gray-300
          text-xl
          leading-10
          max-w-3xl
          mx-auto
          "
          >

            پلتفرم نسل جدید تحلیل بازار،
            ربات‌های معاملاتی،
            مدیریت سرمایه و آموزش حرفه‌ای.


          </p>


          <div className="mt-10 flex justify-center gap-5">


            <Link
            href="/register"
            className="
            bg-yellow-500
            text-black
            px-8 py-4
            rounded-2xl
            font-bold
            "
            >

              شروع کار


            </Link>


            <Link
            href="/market"
            className="
            border
            border-yellow-500
            text-yellow-400
            px-8 py-4
            rounded-2xl
            "
            >

              مشاهده بازار


            </Link>


          </div>


        </div>


      </section>






      {/* FEATURES */}


      <section className="
      max-w-6xl
      mx-auto
      px-6
      grid
      md:grid-cols-3
      gap-8
      pb-24
      ">



        <Box
        title="🤖 ربات‌های AI"
        text="ربات‌های هوشمند برای تحلیل و مدیریت معاملات."
        />


        <Box
        title="📈 تحلیل بازار"
        text="تحلیل ارز دیجیتال، فارکس و بازارهای مالی."
        />


        <Box
        title="🔐 امنیت"
        text="مدیریت کاربران، حساب‌ها و اطلاعات."
        />



      </section>





      <footer
      className="
      border-t
      border-yellow-600/30
      py-8
      text-center
      text-gray-400
      "
      >

        ABOK AI Platform © 2026

      </footer>


    </main>

  );

}





function Box(
{
title,
text
}:
{
title:string;
text:string;
}

){


return(

<div
className="
bg-zinc-900
border
border-yellow-600/30
rounded-3xl
p-8
hover:-translate-y-2
transition
"
>

<h3
className="
text-2xl
text-yellow-400
font-bold
mb-4
"
>

{title}

</h3>


<p
className="
text-gray-300
leading-8
"
>

{text}

</p>


</div>


)


}
