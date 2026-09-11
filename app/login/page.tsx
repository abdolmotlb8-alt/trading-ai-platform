import AuthForm from "@/components/AuthForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">

      <section className="w-full max-w-md">

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">

          <h1 className="text-3xl font-bold text-center text-cyan-400 mb-3">
            ورود به Trading AI
          </h1>


          <p className="text-center text-gray-400 mb-8">
            وارد حساب کاربری خود شوید
          </p>


          <AuthForm />


          <div className="mt-6 text-center text-sm text-gray-400">

            حساب ندارید؟

            <Link
              href="/register"
              className="text-cyan-400 hover:text-cyan-300 mr-2"
            >
              ثبت نام کنید
            </Link>

          </div>


        </div>

      </section>

    </main>
  );
}
