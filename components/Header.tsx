"use client";

import Link from "next/link";
import {
  Menu,
  Bell,
  Search,
  UserCircle
} from "lucide-react";

import { useState } from "react";


export default function Header() {

  const [open, setOpen] = useState(false);


  return (

    <header className="
      sticky
      top-0
      z-50
      w-full
      bg-white/80
      backdrop-blur-xl
      border-b
      border-slate-200
    ">


      <div className="
        max-w-7xl
        mx-auto
        px-5
        sm:px-8
      ">


        <div className="
          h-20
          flex
          items-center
          justify-between
          gap-5
        ">


          {/* Logo */}

          <Link
            href="/"
            className="
              text-2xl
              font-black
              text-cyan-600
              whitespace-nowrap
            "
          >

            Trading AI

          </Link>




          {/* Desktop Menu */}

          <nav className="
            hidden
            md:flex
            items-center
            gap-8
            text-slate-700
            font-semibold
          ">


            <Link href="/" className="hover:text-cyan-600 transition">
              خانه
            </Link>


            <Link href="/dashboard" className="hover:text-cyan-600 transition">
              داشبورد
            </Link>


            <Link href="/market" className="hover:text-cyan-600 transition">
              بازار
            </Link>


            <Link href="/signals" className="hover:text-cyan-600 transition">
              سیگنال AI
            </Link>


            <Link href="/bots" className="hover:text-cyan-600 transition">
              ربات‌ها
            </Link>


          </nav>





          {/* Actions */}

          <div className="
            flex
            items-center
            gap-2
          ">


            <button className="
              hidden
              sm:flex
              w-10
              h-10
              items-center
              justify-center
              rounded-xl
              hover:bg-slate-100
              transition
            ">
              <Search size={21}/>
            </button>



            <button className="
              hidden
              sm:flex
              w-10
              h-10
              items-center
              justify-center
              rounded-xl
              hover:bg-slate-100
              transition
            ">
              <Bell size={21}/>
            </button>



            <Link
              href="/login"
              className="
                hidden
                sm:flex
                items-center
                gap-2
                px-4
                py-2
                rounded-xl
                text-slate-700
                hover:text-cyan-600
                transition
              "
            >

              <UserCircle size={22}/>

              ورود

            </Link>




            {/* Mobile Menu Button */}

            <button
              onClick={() => setOpen(!open)}
              className="
                md:hidden
                w-11
                h-11
                rounded-xl
                bg-cyan-500
                text-white
                flex
                items-center
                justify-center
              "
            >

              <Menu size={25}/>

            </button>


          </div>



        </div>






        {/* Mobile Menu */}

        {
          open && (

            <div className="
              md:hidden
              pb-5
              pt-2
              flex
              flex-col
              gap-4
              text-right
              text-slate-700
              font-semibold
            ">


              <Link href="/">
                خانه
              </Link>


              <Link href="/dashboard">
                داشبورد
              </Link>


              <Link href="/market">
                بازار
              </Link>


              <Link href="/signals">
                سیگنال AI
              </Link>


              <Link href="/bots">
                ربات‌ها
              </Link>


              <Link href="/login">
                ورود
              </Link>


            </div>

          )
        }



      </div>


    </header>

  );

}
