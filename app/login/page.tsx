import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8"
    >
      <section className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-center text-cyan-400 mb-3">
            ورود به Trading AI
          </h1>

          <p className="text-center text-gray-400 mb-8">
            وارد حساب کاربری خود شوید یا حساب جدید بسازید
          </p>

          <AuthForm />
        </div>
      </section>
    </main>
  );
}
