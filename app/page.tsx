/* =========================
   Global Modern Style
========================= */

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}


html {
  direction: rtl;
  scroll-behavior: smooth;
  overflow-x: hidden;
}


body {
  direction: rtl;
  background: #ffffff;
  color: #111827;

  font-family:
    "Vazirmatn",
    "IRANSans",
    Tahoma,
    Arial,
    sans-serif;

  overflow-x: hidden;

  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}


/* جلوگیری از بیرون زدن عناصر */

img,
svg,
video {
  max-width: 100%;
  height: auto;
}


/* لینک ها */

a {
  color: inherit;
  text-decoration: none;
}


/* =========================
   Container حرفه ای
========================= */


.container {

  width: 100%;

  max-width: 1280px;

  margin: 0 auto;

  padding-left: 32px;

  padding-right: 32px;

}



/* =========================
   Typography فارسی
========================= */


h1,
h2,
h3,
h4 {

  font-weight: 800;

  line-height: 1.7;

  letter-spacing: -0.3px;

  word-spacing: 6px;

}


p {

  font-size: 17px;

  line-height: 2.2;

  color: #4b5563;

  word-spacing: 5px;

  letter-spacing: 0;

}


/* متن فارسی بهتر */

button,
input,
textarea {

  font-family: inherit;

}


/* =========================
   Buttons Modern
========================= */


button {

  cursor: pointer;

  border: none;

  transition: all .3s ease;

}


button:hover {

  transform: translateY(-2px);

}



/* =========================
   کارت های سایت
========================= */


.card {

  background: white;

  border-radius: 24px;

  padding: 32px;

  border:1px solid #e5e7eb;

  box-shadow:

  0 15px 40px rgba(0,0,0,.06);

}



/* =========================
   موبایل
========================= */


@media(max-width:768px){


.container {

  padding-left: 22px;

  padding-right: 22px;

}



h1 {

 font-size:32px;

}



h2 {

 font-size:26px;

}



h3 {

 font-size:21px;

}



p {

 font-size:16px;

 line-height:2.1;

}



}


/* موبایل کوچک */


@media(max-width:480px){


.container {

 padding-left:18px;

 padding-right:18px;

}


h1 {

 font-size:28px;

}


p {

 font-size:15px;

}



}



/* =========================
   Scrollbar زیبا
========================= */


::-webkit-scrollbar {

 width:8px;

}


::-webkit-scrollbar-track {

 background:#f1f5f9;

}


::-webkit-scrollbar-thumb {

 background:#06b6d4;

 border-radius:20px;

}


/* =========================
   انتخاب متن
========================= */


::selection {

 background:#06b6d4;

 color:white;

}
