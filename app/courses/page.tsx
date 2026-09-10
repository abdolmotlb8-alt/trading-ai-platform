export default function CoursesPage() {
  const courses = [
    {
      name: "دوره رایگان شروع معامله‌گری",
      duration: "7 روز",
      price: "رایگان",
      status: "فعال",
    },
    {
      name: "دوره VIP فارکس و کریپتو",
      duration: "30 روز",
      price: "پرداخت تتری / ریالی",
      status: "ویژه",
    },
    {
      name: "دوره حرفه‌ای هوش مصنوعی معامله‌گری",
      duration: "60 روز",
      price: "پرداخت تتری / ریالی",
      status: "پیشرفته",
    },
  ];

  return (
    <main>
      <h1>
        دوره‌های آموزشی
      </h1>

      <p>
        آموزش معامله‌گری، تحلیل بازار و استفاده از ربات‌های هوشمند
      </p>


      {courses.map((course, index) => (
        <section key={index}>

          <h2>
            {course.name}
          </h2>

          <p>
            مدت دوره: {course.duration}
          </p>

          <p>
            قیمت: {course.price}
          </p>

          <p>
            وضعیت: {course.status}
          </p>

          <button>
            مشاهده دوره
          </button>

        </section>
      ))}

    </main>
  );
}
