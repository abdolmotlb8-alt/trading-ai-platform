"use client";

import { useState } from "react";

export default function AuthForm() {
  const [mode, setMode] = useState("login");

  return (
    <section>

      <h1>
        {mode === "login" ? "ورود به حساب" : "ساخت حساب جدید"}
      </h1>


      <input
        type="email"
        placeholder="ایمیل"
      />


      <input
        type="password"
        placeholder="رمز عبور"
      />


      {mode === "register" && (
        <input
          type="text"
          placeholder="نام کاربر"
        />
      )}


      <button>
        {mode === "login" ? "ورود" : "ثبت نام"}
      </button>



      <p>

        {mode === "login"
          ? "حساب ندارید؟"
          : "قبلاً ثبت نام کرده‌اید؟"}

        <button
          onClick={() =>
            setMode(
              mode === "login"
                ? "register"
                : "login"
            )
          }
        >
          {mode === "login"
            ? "ثبت نام"
            : "ورود"}
        </button>

      </p>


    </section>
  );
}
