export default function CoursesPage() {
  const courses = [
    {
      title: "آموزش مقدماتی ترید",
      level: "مبتدی",
      status: "فعال",
      progress: "100%",
    },
    {
      title: "تحلیل تکنیکال حرفه‌ای",
      level: "متوسط",
      status: "در حال یادگیری",
      progress: "60%",
    },
    {
      title: "استراتژی‌های هوش مصنوعی",
      level: "حرفه‌ای",
      status: "VIP",
      progress: "قفل",
    },
  ];


  return (
    <main>

      <h1>
        دوره‌های آموزشی
      </h1>

      <p>
        یادگیری معامله‌گری، تحلیل بازار و استفاده از هوش مصنوعی
      </p>



      <section>

        <h2>
          دوره‌های من
        </h2>


        {courses.map((course, index) => (
          <div key={index}>

            <h3>
              {course.title}
            </h3>

            <p>
              سطح: {course.level}
            </p>

            <p>
              وضعیت: {course.status}
            </p>

            <p>
              پیشرفت: {course.progress}
            </p>


            <button>
              شروع دوره
            </button>


          </div>
        ))}


      </section>



      <section>

        <h2>
          دوره‌های ویژه VIP
        </h2>

        <p>
          🤖 آموزش ساخت ربات معامله‌گر
        </p>

        <p>
          📊 آموزش تحلیل با هوش مصنوعی
        </p>

        <p>
          🥇 آموزش معامله طلا و فارکس
        </p>

      </section>



      <section>

        <h2>
          مزایای آموزش‌ها
        </h2>

        <p>
          ✅ آموزش مرحله به مرحله
        </p>

        <p>
          ✅ تمرین عملی بازار
        </p>

        <p>
          ✅ دسترسی به محتوای VIP
        </p>

      </section>


    </main>
  );
}
