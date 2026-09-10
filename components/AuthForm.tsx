"use client";

import { useState } from "react";

export default function AuthForm() {

  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");



  async function handleSubmit() {

    if (mode === "register") {

      const response = await fetch("/api/register", {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          email,
          password,
        }),

      });


      const data = await response.json();


      setMessage(data.message);

    }

    else {

      setMessage("سیستم ورود در مرحله بعد فعال می‌شود");

    }

  }



  return (

    <section>


      <h1>
        {mode === "login"
          ? "ورود به حساب"
          : "ساخت حساب جدید"}
      </h1>



      {mode === "register" && (

        <input

          type="text"

          placeholder="نام کاربر"

          value={name}

          onChange={(e) =>
            setName(e.target.value)
          }

        />

      )}



      <input

        type="email"

        placeholder="ایمیل"

        value={email}

        onChange={(e) =>
          setEmail(e.target.value)
        }

      />



      <input

        type="password"

        placeholder="رمز عبور"

        value={password}

        onChange={(e) =>
          setPassword(e.target.value)
        }

      />



      <button onClick={handleSubmit}>

        {mode === "login"
          ? "ورود"
          : "ثبت نام"}

      </button>



      <p>
        {message}
      </p>



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
          ? "ساخت حساب جدید"
          : "ورود به حساب"}

      </button>



    </section>

  );

}
