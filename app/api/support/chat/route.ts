import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

function normalizeText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک");
}

function getAssistantAnswer(message: string) {
  const text = normalizeText(message);

  if (
    text.includes("ربات") &&
    (text.includes("فعال") || text.includes("روشن"))
  ) {
    return "برای فعال کردن ربات، وارد بخش «ربات‌ها» شوید، ربات موردنظر را انتخاب کنید و تنظیمات آن را بررسی کنید. سپس می‌توانید وضعیت ربات را از غیرفعال به فعال تغییر دهید.";
  }

  if (
    text.includes("متاتریدر") ||
    text.includes("mt5") ||
    text.includes("mt4")
  ) {
    return "اتصال متاتریدر هنوز در حال تکمیل است. در حال حاضر می‌توانید تنظیمات ربات و پارامترهای معاملاتی را آماده کنید. اتصال واقعی به حساب بروکر در مرحله اتصال بروکر انجام خواهد شد.";
  }

  if (
    text.includes("اخبار") ||
    text.includes("خبر") ||
    text.includes("اقتصادی")
  ) {
    return "بخش اخبار اقتصادی برای نمایش رویدادهای مهم بازار، زمان انتشار خبر و سطح اهمیت آن طراحی شده است. فیلتر اخبار نیز قرار است قبل از اجرای معاملات و تحلیل‌های حساس مورد استفاده قرار بگیرد.";
  }

  if (
    text.includes("تلگرام") ||
    text.includes("telegram")
  ) {
    return "برای فعال کردن اعلان تلگرام، ابتدا ربات تلگرام و کانال مقصد باید تنظیم شوند. سپس اعلان‌های سیگنال و اخبار می‌توانند به کانال ارسال شوند.";
  }

  if (
    text.includes("سیگنال") ||
    text.includes("تحلیل")
  ) {
    return "سیگنال‌های Trading AI قرار است بر اساس مجموعه‌ای از تأییدیه‌ها مانند ساختار بازار، نقدینگی، حمایت و مقاومت، کندل‌ها، حجم، تایم‌فریم‌های مختلف و فیلترهای بازار تولید شوند. در صورت کافی نبودن تأییدیه‌ها، سیستم می‌تواند وضعیت NO TRADE را اعلام کند.";
  }

  if (
    text.includes("تیکت") ||
    text.includes("پشتیبانی") ||
    text.includes("ادمین")
  ) {
    return "اگر موضوع شما نیاز به بررسی تیم پشتیبانی دارد، از بخش «درخواست پشتیبانی» یک تیکت ایجاد کنید. پیام شما در سیستم ثبت می‌شود و پاسخ تیم پشتیبانی داخل همان تیکت نمایش داده خواهد شد.";
  }

  if (
    text.includes("tp") ||
    text.includes("حد سود") ||
    text.includes("take profit")
  ) {
    return "حد سود یا Take Profit مقدار سود هدف معامله را مشخص می‌کند. مقدار آن باید متناسب با حد ضرر، حجم معامله و استراتژی ربات تنظیم شود.";
  }

  if (
    text.includes("sl") ||
    text.includes("حد ضرر") ||
    text.includes("stop loss")
  ) {
    return "حد ضرر یا Stop Loss برای محدود کردن زیان معامله استفاده می‌شود. قبل از فعال کردن ربات، مقدار حد ضرر و سقف زیان روزانه را بررسی کنید.";
  }

  if (
    text.includes("سرمایه") ||
    text.includes("پول") ||
    text.includes("50 دلار") ||
    text.includes("۵۰ دلار")
  ) {
    return "برای سرمایه‌های کوچک، کنترل ریسک اهمیت زیادی دارد. بهتر است حجم معامله، حد ضرر روزانه و تعداد معاملات باز محدود باشند و قبل از اجرای واقعی، تنظیمات ربات با حساب آزمایشی بررسی شوند.";
  }

  if (
    text.includes("سلام") ||
    text.includes("درود") ||
    text.includes("hello") ||
    text.includes("hi")
  ) {
    return "سلام 👋 به دستیار پشتیبانی Trading AI خوش آمدید. سؤال خود را بپرسید؛ درباره ربات‌ها، تحلیل، اخبار، سیگنال‌ها، تلگرام و پشتیبانی می‌توانم راهنمایی‌تان کنم.";
  }

  return "سؤال شما دریافت شد. من در حال حاضر می‌توانم درباره ربات‌ها، تحلیل بازار، سیگنال‌ها، اخبار اقتصادی، اتصال متاتریدر، تلگرام و سیستم پشتیبانی راهنمایی کنم. اگر موضوع شما نیاز به بررسی توسط ادمین دارد، می‌توانید از بخش «درخواست پشتیبانی» یک تیکت ایجاد کنید.";
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error: "برای استفاده از دستیار پشتیبانی ابتدا وارد حساب شوید.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return NextResponse.json(
        {
          error: "لطفاً سؤال خود را وارد کنید.",
        },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        {
          error: "پیام شما نباید بیشتر از ۲۰۰۰ کاراکتر باشد.",
        },
        { status: 400 }
      );
    }

    const answer = getAssistantAnswer(message);

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("POST /api/support/chat error:", error);

    return NextResponse.json(
      {
        error: "خطا در ارتباط با دستیار پشتیبانی.",
      },
      { status: 500 }
    );
  }
}
