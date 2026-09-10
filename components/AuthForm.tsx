async function handleSubmit() {
  try {
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

    setMessage(data.message || "پاسخی دریافت نشد");

    if (response.ok && data.user) {
      setUser(data.user);
    }

  } catch (error) {
    console.log(error);
    setMessage("خطا در اتصال به سرور");
  }
}
