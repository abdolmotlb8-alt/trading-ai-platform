"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function AuthForm() {

  const router = useRouter();


  const [mode, setMode] =
    useState<"login" | "register">("login");


  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const [message, setMessage] = useState("");

  const [user, setUser] = useState<any>(null);



  async function handleSubmit() {


    try {


      setMessage("در حال بررسی...");



      const url =
        mode === "register"
          ? "/api/register"
          : "/api/auth/login";




      const body =
        mode === "register"
          ? {
              name,
              email,
              password
            }
          :
            {
              email,
              password
            };





      const response =
        await fetch(url, {


          method: "POST",


          headers: {

            "Content-Type": "application/json"

          },


          body: JSON.stringify(body)

        });





      const data =
        await response.json();





      setMessage(
        data.message ||
        "خطای نامشخص"
      );





      if (response.ok && data.user) {


        setUser(data.user);



        if (mode === "login") {


          router.push("/dashboard");


        }


      }





    } catch (error) {


      console.error(
        "AUTH ERROR:",
        error
      );


      setMessage(
        "خطا در ارتباط با سرور"
      );


    }


  }






  return (

    <section>


      <h1>

        {
          mode === "login"
          ? "ورود به حساب"
          : "ساخت حساب جدید"
        }

      </h1>





      {
        mode === "register" && (


          <input

            placeholder="نام کاربر"

            value={name}

            onChange={(e)=>
              setName(e.target.value)
            }

          />


        )

      }






      <input


        type="email"


        placeholder="ایمیل"


        value={email}


        onChange={(e)=>
          setEmail(e.target.value)
        }


      />







      <input


        type="password"


        placeholder="رمز عبور"


        value={password}


        onChange={(e)=>
          setPassword(e.target.value)
        }


      />







      <button onClick={handleSubmit}>


        {
          mode === "login"
          ? "ورود"
          : "ثبت نام"
        }


      </button>






      <p>

        {message}

      </p>







      {
        user && (


          <div>


            <h3>

              خوش آمدید {user.name}

            </h3>


            <p>

              نقش: {user.role}

            </p>


            <p>

              پلن: {user.plan}

            </p>



          </div>


        )

      }







      <button


        onClick={() => {


          setMode(

            mode === "login"
            ? "register"
            : "login"

          );


          setMessage("");

        }}


      >


        {

          mode === "login"

          ? "ساخت حساب جدید"

          : "ورود"

        }


      </button>





    </section>

  );


}
