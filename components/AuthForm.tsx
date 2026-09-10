"use client";

import { useState } from "react";

export default function AuthForm() {

  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");

  const [user, setUser] = useState<any>(null);



  async function handleSubmit() {

    const url =
      mode === "register"
        ? "/api/register"
        : "/api/login";



    const body =
      mode === "register"
        ? {
            name,
            email,
            password,
          }
        : {
            email,
            password,
          };



    const response = await fetch(url, {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),

    });



    const data = await response.json();



    setMessage(data.message);



    if (response.ok && data.user) {

      setUser(data.user);

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



      {user && (

        <section>

          <h3>
            خوش آمدید {user.name}
          </h3>

          <p>
            نقش: {user.role}
          </p>

          <p>
            پلن: {user.plan}
          </p>

        </section>

      )}



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
          ? "ثبت نام جدید"
          : "ورود"}

      </button>



    </section>

  );

}
