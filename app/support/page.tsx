"use client";

import { useEffect, useMemo, useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    message: string;
    senderType: string;
    createdAt: string;
  }[];
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: string;
  publishedAt: string;
};

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

const quickQuestions = [
  "چطور ربات معاملاتی را فعال کنم؟",
  "چطور تیکت پشتیبانی ایجاد کنم؟",
  "اخبار اقتصادی سایت چگونه کار می‌کند؟",
  "چطور متاتریدر را وصل کنم؟",
  "چطور اعلان تلگرام را فعال کنم؟",
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text:
        "سلام 👋 من دستیار پشتیبانی Trading AI هستم.\n\n" +
        "می‌توانم درباره حساب، ربات‌ها، اخبار، سیگنال‌ها، تلگرام، متاتریدر و بخش‌های مختلف سایت راهنمایی‌تان کنم.\n\n" +
        "اگر پاسخ سؤال شما را ندانم، می‌توانیم برایتان تیکت واقعی پشتیبانی ایجاد کنیم.",
    },
  ]);

  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState("NORMAL");
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementResult, setAnnouncementResult] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [supportResponse, announcementResponse] = await Promise.all([
        fetch("/api/support", {
          cache: "no-store",
        }),
        fetch("/api/announcements", {
          cache: "no-store",
        }),
      ]);

      if (supportResponse.ok) {
        const supportData = await supportResponse.json();
        setTickets(supportData.tickets || []);
      }

      if (announcementResponse.ok) {
        const announcementData = await announcementResponse.json();
        setAnnouncements(announcementData.announcements || []);
      }
    } catch {
      // صفحه حتی در صورت خطای موقت API نیز باز می‌ماند.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.status === "OPEN" ||
          ticket.status === "IN_PROGRESS"
      ).length,
    [tickets]
  );

  async function createTicket() {
    if (!subject.trim() || !message.trim()) {
      alert("موضوع و متن درخواست را وارد کنید.");
      return;
    }

    try {
      setCreatingTicket(true);

      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "ایجاد تیکت انجام نشد.");
        return;
      }

      setSubject("");
      setMessage("");

      await loadData();

      alert("تیکت با موفقیت ایجاد شد.");
    } catch {
      alert("خطا در ارتباط با سرور.");
    } finally {
      setCreatingTicket(false);
    }
  }

  async function sendChat(customMessage?: string) {
    const text = (customMessage ?? chatInput).trim();

    if (!text || chatLoading) {
      return;
    }

    setChatMessages((previous) => [
      ...previous,
      {
        role: "user",
        text,
      },
    ]);

    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = await response.json();

      setChatMessages((previous) => [
        ...previous,
        {
          role: "bot",
          text:
            data.answer ||
            "متأسفانه در حال حاضر نتوانستم پاسخ مناسبی پیدا کنم.",
        },
      ]);
    } catch {
      setChatMessages((previous) => [
        ...previous,
        {
          role: "bot",
          text:
            "ارتباط با سرور پشتیبانی برقرار نشد. لطفاً دوباره تلاش کنید یا یک تیکت ایجاد کنید.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function publishAnnouncement() {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      setAnnouncementResult("عنوان و متن اعلامیه را وارد کنید.");
      return;
    }

    try {
      setAnnouncementLoading(true);
      setAnnouncementResult("");

      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          message: announcementMessage.trim(),
          priority: announcementPriority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAnnouncementResult(
          data.error || "انتشار اعلامیه انجام نشد."
        );
        return;
      }

      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementPriority("NORMAL");
      setAnnouncementResult("اعلامیه با موفقیت منتشر شد.");

      await loadData();
    } catch {
      setAnnouncementResult("خطا در ارتباط با سرور.");
    } finally {
      setAnnouncementLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#050b16] px-4 py-6 text-white sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#0d1b2f] via-[#0b1627] to-[#07101d] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-300">
                TRADING AI SUPPORT ✦
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                مرکز پشتیبانی
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-400 sm:text-base">
                پاسخ‌گویی، ثبت درخواست، مشاهده تیکت‌ها و دریافت
                اعلامیه‌های رسمی Trading AI در یک محیط مرتب و حرفه‌ای.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-center">
                <div className="text-2xl font-black text-cyan-300">
                  {tickets.length}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  کل تیکت‌ها
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-center">
                <div className="text-2xl font-black text-emerald-300">
                  {openTickets}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  درخواست فعال
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Announcements */}
        <section className="rounded-3xl border border-white/5 bg-[#0b1525] p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">اعلامیه‌های رسمی</h2>
              <p className="mt-1 text-sm text-slate-500">
                آخرین اطلاعیه‌های منتشرشده برای کاربران
              </p>
            </div>

            <span className="w-fit rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300">
              {announcements.length} اعلامیه
            </span>
          </div>

          {announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#081220] p-8 text-center">
              <div className="text-4xl">📢</div>
              <p className="mt-3 text-sm text-slate-400">
                هنوز اعلامیه‌ای منتشر نشده است.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#101c30] to-[#0a1423] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
                      📢
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        announcement.priority === "HIGH"
                          ? "bg-red-400/10 text-red-300"
                          : announcement.priority === "LOW"
                            ? "bg-slate-400/10 text-slate-400"
                            : "bg-cyan-400/10 text-cyan-300"
                      }`}
                    >
                      {announcement.priority === "HIGH"
                        ? "مهم"
                        : announcement.priority === "LOW"
                          ? "عادی"
                          : "اطلاعیه"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold">
                    {announcement.title}
                  </h3>

                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
                    {announcement.message}
                  </p>

                  <div className="mt-4 border-t border-white/5 pt-3 text-xs text-slate-600">
                    {new Date(
                      announcement.publishedAt
                    ).toLocaleString("fa-IR")}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Main grid */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* AI Support */}
          <div className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-[#0b1525] shadow-xl">
            <div className="border-b border-white/5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">
                    دستیار پشتیبانی Trading AI
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    پاسخ‌گویی سریع به سؤالات کاربران
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setChatOpen((value) => !value)}
                  className="rounded-xl bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/20"
                >
                  {chatOpen ? "بستن" : "باز کردن"}
                </button>
              </div>
            </div>

            {chatOpen && (
              <>
                <div className="h-[390px] space-y-4 overflow-y-auto p-5">
                  {chatMessages.map((chat, index) => (
                    <div
                      key={`${chat.role}-${index}`}
                      className={`flex ${
                        chat.role === "user"
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-7 ${
                          chat.role === "user"
                            ? "bg-cyan-400 text-[#03111b]"
                            : "border border-white/5 bg-[#111d30] text-slate-300"
                        }`}
                      >
                        {chat.text}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-end">
                      <div className="rounded-2xl bg-[#111d30] px-4 py-3 text-sm text-cyan-300">
                        در حال بررسی سؤال...
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 p-5">
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {quickQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => sendChat(question)}
                        className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300"
                      >
                        {question}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(event) =>
                        setChatInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          sendChat();
                        }
                      }}
                      placeholder="سؤال خود را بنویسید..."
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                    />

                    <button
                      type="button"
                      onClick={() => sendChat()}
                      disabled={chatLoading}
                      className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#03111b] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ارسال
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Create ticket */}
          <div className="rounded-3xl border border-white/5 bg-[#0b1525] p-5 shadow-xl sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-black">ارسال درخواست پشتیبانی</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                اگر دستیار نتوانست پاسخ مناسب بدهد، درخواست خود را
                مستقیماً برای تیم پشتیبانی ارسال کنید.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  موضوع
                </label>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="مثلاً مشکل اتصال متاتریدر"
                  className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  توضیحات
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="مشکل یا سؤال خود را کامل توضیح دهید..."
                  rows={7}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                />
              </div>

              <button
                type="button"
                onClick={createTicket}
                disabled={creatingTicket}
                className="w-full rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-black text-[#03111b] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingTicket
                  ? "در حال ایجاد تیکت..."
                  : "ایجاد تیکت پشتیبانی"}
              </button>
            </div>
          </div>
        </section>

        {/* Tickets */}
        <section className="rounded-3xl border border-white/5 bg-[#0b1525] p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">درخواست‌های من</h2>
              <p className="mt-1 text-sm text-slate-500">
                وضعیت و پیام‌های درخواست‌های پشتیبانی شما
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              بروزرسانی
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-[#081220] p-8 text-center text-sm text-slate-500">
              در حال دریافت اطلاعات...
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#081220] p-10 text-center">
              <div className="text-5xl">📬</div>
              <p className="mt-4 font-bold text-slate-300">
                هنوز تیکتی ثبت نکرده‌اید
              </p>
              <p className="mt-2 text-sm text-slate-600">
                در صورت نیاز از فرم ارسال درخواست استفاده کنید.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-2xl border border-white/5 bg-[#081220] p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-white">
                        {ticket.subject}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {new Date(ticket.createdAt).toLocaleString(
                          "fa-IR"
                        )}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs ${
                        ticket.status === "CLOSED"
                          ? "bg-slate-400/10 text-slate-500"
                          : ticket.status === "IN_PROGRESS"
                            ? "bg-amber-400/10 text-amber-300"
                            : "bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      {ticket.status === "CLOSED"
                        ? "بسته شده"
                        : ticket.status === "IN_PROGRESS"
                          ? "در حال بررسی"
                          : "باز"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {ticket.messages.slice(-3).map((ticketMessage) => (
                      <div
                        key={ticketMessage.id}
                        className={`rounded-xl p-3 text-sm leading-7 ${
                          ticketMessage.senderType === "USER"
                            ? "bg-cyan-400/5 text-slate-400"
                            : "bg-emerald-400/5 text-emerald-200"
                        }`}
                      >
                        {ticketMessage.message}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Admin announcements */}
        <section className="rounded-3xl border border-amber-400/10 bg-[#0b1525] p-5 shadow-xl sm:p-6">
          <button
            type="button"
            onClick={() =>
              setAnnouncementOpen((value) => !value)
            }
            className="flex w-full items-center justify-between text-right"
          >
            <div>
              <h2 className="text-lg font-black">
                مدیریت اعلامیه‌ها
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                فقط مدیر سایت می‌تواند اعلامیه رسمی منتشر کند.
              </p>
            </div>

            <span className="rounded-xl bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
              {announcementOpen ? "بستن" : "باز کردن"}
            </span>
          </button>

          {announcementOpen && (
            <div className="mt-6 rounded-2xl border border-white/5 bg-[#081220] p-5">
              <div className="grid gap-4">
                <input
                  value={announcementTitle}
                  onChange={(event) =>
                    setAnnouncementTitle(event.target.value)
                  }
                  placeholder="عنوان اعلامیه"
                  className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400/40"
                />

                <textarea
                  value={announcementMessage}
                  onChange={(event) =>
                    setAnnouncementMessage(event.target.value)
                  }
                  placeholder="متن کامل اعلامیه..."
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-slate-600 focus:border-amber-400/40"
                />

                <select
                  value={announcementPriority}
                  onChange={(event) =>
                    setAnnouncementPriority(event.target.value)
                  }
                  className="rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="LOW">عادی</option>
                  <option value="NORMAL">اطلاعیه</option>
                  <option value="HIGH">مهم</option>
                </select>

                <button
                  type="button"
                  onClick={publishAnnouncement}
                  disabled={announcementLoading}
                  className="rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-black text-[#1c1300] transition hover:bg-amber-300 disabled:opacity-50"
                >
                  {announcementLoading
                    ? "در حال انتشار..."
                    : "انتشار اعلامیه"}
                </button>

                {announcementResult && (
                  <div className="rounded-xl bg-white/[0.03] p-3 text-sm text-slate-400">
                    {announcementResult}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
