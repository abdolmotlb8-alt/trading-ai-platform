"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TicketMessage = {
  id: string;
  message: string;
  senderType: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: string;
  publishedAt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
};

const quickQuestions = [
  "چطور ربات معاملاتی را فعال کنم؟",
  "چطور متاتریدر را وصل کنم؟",
  "اخبار اقتصادی چگونه کار می‌کند؟",
  "چطور اعلان تلگرام را فعال کنم؟",
];

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "CLOSED":
      return "بسته شده";
    case "IN_PROGRESS":
      return "در حال بررسی";
    case "ANSWERED":
      return "پاسخ داده شده";
    default:
      return "باز";
  }
}

function getPriorityText(priority: string) {
  switch (priority) {
    case "HIGH":
      return "مهم";
    case "LOW":
      return "عادی";
    default:
      return "اطلاعیه";
  }
}

function createLocalMessage(
  role: "user" | "assistant",
  text: string
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random()}`,
    role,
    text,
    time: new Date().toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    createLocalMessage(
      "assistant",
      "سلام 👋\nمن دستیار پشتیبانی Trading AI هستم.\n\nمی‌توانم درباره حساب کاربری، ربات‌ها، اخبار، سیگنال‌ها، تلگرام، متاتریدر و بخش‌های مختلف سایت راهنمایی‌تان کنم.\n\nاگر پاسخ سؤال شما در سیستم من نباشد، می‌توانید مستقیماً یک تیکت برای تیم پشتیبانی ایجاد کنید."
    ),
  ]);

  const openTickets = useMemo(() => {
    return tickets.filter(
      (ticket) =>
        ticket.status === "OPEN" ||
        ticket.status === "IN_PROGRESS" ||
        ticket.status === "ANSWERED"
    ).length;
  }, [tickets]);

  const latestAnnouncement = announcements[0];

  async function loadData(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [supportResponse, announcementsResponse] =
        await Promise.all([
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

      if (announcementsResponse.ok) {
        const announcementData =
          await announcementsResponse.json();

        setAnnouncements(
          announcementData.announcements || []
        );
      }
    } catch (error) {
      console.error("SUPPORT_LOAD_ERROR", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim()) {
      alert("لطفاً موضوع درخواست را وارد کنید.");
      return;
    }

    if (!message.trim()) {
      alert("لطفاً متن درخواست را وارد کنید.");
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
        alert(
          data.error ||
            "ایجاد درخواست پشتیبانی انجام نشد."
        );
        return;
      }

      setSubject("");
      setMessage("");

      await loadData(true);

      alert("درخواست شما با موفقیت ثبت شد.");
    } catch (error) {
      console.error("CREATE_TICKET_ERROR", error);
      alert("خطا در ارتباط با سرور.");
    } finally {
      setCreatingTicket(false);
    }
  }

  async function sendChat(customText?: string) {
    const text = (
      customText !== undefined ? customText : chatInput
    ).trim();

    if (!text || chatLoading) {
      return;
    }

    setChatMessages((previous) => [
      ...previous,
      createLocalMessage("user", text),
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

      if (!response.ok) {
        throw new Error(
          data.error || "Support request failed"
        );
      }

      setChatMessages((previous) => [
        ...previous,
        createLocalMessage(
          "assistant",
          data.answer ||
            "در حال حاضر پاسخ مناسبی برای این سؤال پیدا نکردم. لطفاً یک تیکت پشتیبانی ایجاد کنید."
        ),
      ]);
    } catch (error) {
      console.error("SUPPORT_CHAT_ERROR", error);

      setChatMessages((previous) => [
        ...previous,
        createLocalMessage(
          "assistant",
          "ارتباط با سرویس پشتیبانی برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید یا یک تیکت برای تیم پشتیبانی ایجاد کنید."
        ),
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <>
      <div className="support-page" dir="rtl">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <div className="support-container">
          {/* HEADER */}
          <header className="support-header">
            <div className="header-brand">
              <div className="brand-logo">
                <span>✦</span>
              </div>

              <div>
                <div className="brand-name">
                  Trading AI
                </div>

                <div className="brand-subtitle">
                  مرکز پشتیبانی و خدمات کاربران
                </div>
              </div>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <span
                className={
                  refreshing ? "refresh-icon spinning" : "refresh-icon"
                }
              >
                ↻
              </span>

              {refreshing
                ? "در حال بروزرسانی"
                : "بروزرسانی"}
            </button>
          </header>

          {/* HERO */}
          <section className="support-hero">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="status-dot" />
                پشتیبانی آنلاین Trading AI
              </div>

              <h1>
                همیشه یک قدم
                <span> با شما</span>
              </h1>

              <p>
                سؤالتان را بپرسید، درخواست پشتیبانی ثبت کنید
                و آخرین اطلاعیه‌های رسمی Trading AI را در
                یک محیط حرفه‌ای و منظم دنبال کنید.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => {
                    document
                      .getElementById("new-ticket")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }}
                >
                  <span>＋</span>
                  ایجاد درخواست
                </button>

                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    document
                      .getElementById("support-chat")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }}
                >
                  <span>✦</span>
                  گفتگو با دستیار
                </button>
              </div>
            </div>

            <div className="hero-visual">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />

              <div className="hero-orb">
                <div className="orb-icon">✦</div>
                <div className="orb-title">
                  SUPPORT
                </div>
                <div className="orb-status">
                  پاسخ‌گویی فعال
                </div>
              </div>

              <div className="floating-card floating-top">
                <span>●</span>
                پاسخ‌گویی سریع
              </div>

              <div className="floating-card floating-bottom">
                <span>✓</span>
                ثبت درخواست آنلاین
              </div>
            </div>
          </section>

          {/* STATS */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">◎</div>

              <div className="stat-info">
                <span>کل درخواست‌ها</span>
                <strong>
                  {loading ? "—" : tickets.length}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">✓</div>

              <div className="stat-info">
                <span>درخواست‌های فعال</span>
                <strong>
                  {loading ? "—" : openTickets}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">◈</div>

              <div className="stat-info">
                <span>اعلامیه‌ها</span>
                <strong>
                  {loading
                    ? "—"
                    : announcements.length}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon cyan">●</div>

              <div className="stat-info">
                <span>وضعیت پشتیبانی</span>
                <strong className="online-text">
                  آنلاین
                </strong>
              </div>
            </div>
          </section>

          {/* ANNOUNCEMENT */}
          <section className="section-block">
            <div className="section-heading">
              <div>
                <div className="section-kicker">
                  OFFICIAL UPDATES
                </div>

                <h2>اعلامیه‌های رسمی</h2>

                <p>
                  اطلاعیه‌ها و اخبار مهم مربوط به سرویس
                  Trading AI
                </p>
              </div>

              <div className="section-count">
                {announcements.length} مورد
              </div>
            </div>

            {loading ? (
              <div className="loading-box">
                <div className="loader" />
                در حال دریافت اعلامیه‌ها...
              </div>
            ) : announcements.length === 0 ? (
              <div className="empty-box">
                <div className="empty-icon">◌</div>

                <h3>
                  هنوز اعلامیه‌ای منتشر نشده است
                </h3>

                <p>
                  در صورت انتشار اطلاعیه جدید، این بخش
                  بروزرسانی خواهد شد.
                </p>
              </div>
            ) : (
              <div className="announcement-grid">
                {announcements
                  .slice(0, 6)
                  .map((announcement) => (
                    <article
                      className="announcement-card"
                      key={announcement.id}
                    >
                      <div className="announcement-top">
                        <div className="announcement-icon">
                          ◈
                        </div>

                        <span
                          className={`priority priority-${announcement.priority.toLowerCase()}`}
                        >
                          {getPriorityText(
                            announcement.priority
                          )}
                        </span>
                      </div>

                      <h3>
                        {announcement.title}
                      </h3>

                      <p>
                        {announcement.message}
                      </p>

                      <div className="announcement-date">
                        <span>◷</span>
                        {formatDate(
                          announcement.publishedAt
                        )}
                      </div>
                    </article>
                  ))}
              </div>
            )}

            {latestAnnouncement && (
              <div className="latest-announcement">
                <div className="latest-icon">!</div>

                <div>
                  <strong>
                    آخرین اطلاعیه
                  </strong>

                  <span>
                    {latestAnnouncement.title}
                  </span>
                </div>

                <div className="latest-arrow">
                  ←
                </div>
              </div>
            )}
          </section>

          {/* MAIN TWO COLUMN */}
          <section className="main-grid">
            {/* CHAT */}
            <div
              className="panel chat-panel"
              id="support-chat"
            >
              <div className="panel-header">
                <div className="panel-title-wrap">
                  <div className="panel-icon chat-icon">
                    ✦
                  </div>

                  <div>
                    <div className="panel-kicker">
                      AI SUPPORT
                    </div>

                    <h2>
                      دستیار پشتیبانی
                    </h2>
                  </div>
                </div>

                <div className="live-pill">
                  <span />
                  فعال
                </div>
              </div>

              <div className="chat-description">
                سؤال خود را بنویسید؛ دستیار ابتدا
                پایگاه راهنمای Trading AI را بررسی
                می‌کند.
              </div>

              <div className="chat-window">
                {chatMessages.map((chat) => (
                  <div
                    key={chat.id}
                    className={
                      chat.role === "user"
                        ? "message-row user-row"
                        : "message-row"
                    }
                  >
                    {chat.role === "assistant" && (
                      <div className="message-avatar">
                        ✦
                      </div>
                    )}

                    <div
                      className={
                        chat.role === "user"
                          ? "message-bubble user-bubble"
                          : "message-bubble"
                      }
                    >
                      <div className="message-text">
                        {chat.text}
                      </div>

                      <div className="message-time">
                        {chat.time}
                      </div>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="message-row">
                    <div className="message-avatar">
                      ✦
                    </div>

                    <div className="message-bubble">
                      <div className="typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="quick-questions">
                {quickQuestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => sendChat(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>

              <form
                className="chat-input-area"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendChat();
                }}
              >
                <input
                  value={chatInput}
                  onChange={(event) =>
                    setChatInput(event.target.value)
                  }
                  placeholder="سؤال خود را بنویسید..."
                  disabled={chatLoading}
                />

                <button
                  type="submit"
                  disabled={
                    chatLoading ||
                    !chatInput.trim()
                  }
                  aria-label="ارسال پیام"
                >
                  ↑
                </button>
              </form>
            </div>

            {/* NEW TICKET */}
            <div
              className="panel ticket-panel"
              id="new-ticket"
            >
              <div className="panel-header">
                <div className="panel-title-wrap">
                  <div className="panel-icon ticket-icon">
                    +
                  </div>

                  <div>
                    <div className="panel-kicker">
                      SUPPORT TICKET
                    </div>

                    <h2>
                      درخواست جدید
                    </h2>
                  </div>
                </div>
              </div>

              <div className="ticket-intro">
                <div className="intro-number">
                  01
                </div>

                <div>
                  <strong>
                    مشکلتان را برای ما توضیح دهید
                  </strong>

                  <p>
                    هرچه جزئیات بیشتری وارد کنید،
                    بررسی درخواست سریع‌تر و دقیق‌تر
                    انجام می‌شود.
                  </p>
                </div>
              </div>

              <form
                className="ticket-form"
                onSubmit={createTicket}
              >
                <label>
                  <span>موضوع درخواست</span>

                  <input
                    value={subject}
                    onChange={(event) =>
                      setSubject(event.target.value)
                    }
                    placeholder="مثلاً مشکل اتصال متاتریدر"
                    maxLength={120}
                  />
                </label>

                <label>
                  <span>شرح درخواست</span>

                  <textarea
                    value={message}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                    placeholder="مشکل یا سؤال خود را با جزئیات بنویسید..."
                    rows={7}
                    maxLength={4000}
                  />
                </label>

                <div className="form-footer">
                  <span>
                    اطلاعات شما فقط برای بررسی
                    درخواست استفاده می‌شود.
                  </span>

                  <button
                    type="submit"
                    disabled={creatingTicket}
                  >
                    {creatingTicket ? (
                      <>
                        <span className="small-loader" />
                        در حال ثبت...
                      </>
                    ) : (
                      <>
                        ثبت درخواست
                        <span>←</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* TICKETS */}
          <section className="section-block">
            <div className="section-heading">
              <div>
                <div className="section-kicker">
                  MY REQUESTS
                </div>

                <h2>
                  درخواست‌های من
                </h2>

                <p>
                  وضعیت آخرین درخواست‌های پشتیبانی
                  خود را مشاهده کنید.
                </p>
              </div>

              <button
                type="button"
                className="outline-button"
                onClick={() => loadData(true)}
                disabled={refreshing}
              >
                ↻ بروزرسانی
              </button>
            </div>

            {loading ? (
              <div className="loading-box">
                <div className="loader" />
                در حال دریافت درخواست‌ها...
              </div>
            ) : tickets.length === 0 ? (
              <div className="empty-box ticket-empty">
                <div className="empty-icon">◎</div>

                <h3>
                  هنوز درخواستی ثبت نکرده‌اید
                </h3>

                <p>
                  اگر به کمک نیاز دارید، از فرم
                  «درخواست جدید» استفاده کنید.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById("new-ticket")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }}
                >
                  ایجاد اولین درخواست
                </button>
              </div>
            ) : (
              <div className="tickets-list">
                {tickets.map((ticket) => (
                  <article
                    className="ticket-card"
                    key={ticket.id}
                  >
                    <div className="ticket-status">
                      <span
                        className={`status-indicator status-${ticket.status.toLowerCase()}`}
                      />

                      {getStatusText(
                        ticket.status
                      )}
                    </div>

                    <div className="ticket-main">
                      <div className="ticket-id">
                        درخواست
                        <span>
                          #{ticket.id.slice(-6)}
                        </span>
                      </div>

                      <h3>
                        {ticket.subject}
                      </h3>

                      <p>
                        {ticket.messages[
                          ticket.messages.length - 1
                        ]?.message ||
                          "پیامی برای این درخواست ثبت نشده است."}
                      </p>

                      <div className="ticket-meta">
                        <span>
                          ◷{" "}
                          {formatDate(
                            ticket.updatedAt
                          )}
                        </span>

                        <span>
                          {ticket.messages.length} پیام
                        </span>
                      </div>
                    </div>

                    <div className="ticket-arrow">
                      ←
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* HELP GRID */}
          <section className="help-grid">
            <div className="help-card">
              <div className="help-icon">◈</div>

              <div>
                <h3>
                  راهنمای سریع
                </h3>

                <p>
                  پاسخ سؤالات متداول درباره حساب،
                  ربات‌ها و امکانات Trading AI.
                </p>
              </div>

              <span>←</span>
            </div>

            <div className="help-card">
              <div className="help-icon purple-help">
                ⚡
              </div>

              <div>
                <h3>
                  اخبار و اطلاعیه‌ها
                </h3>

                <p>
                  اطلاعیه‌های مهم سرویس را از دست
                  ندهید.
                </p>
              </div>

              <span>←</span>
            </div>

            <div className="help-card">
              <div className="help-icon green-help">
                ✓
              </div>

              <div>
                <h3>
                  پشتیبانی واقعی
                </h3>

                <p>
                  در صورت نیاز درخواست خود را برای
                  تیم پشتیبانی ثبت کنید.
                </p>
              </div>

              <span>←</span>
            </div>
          </section>

          <footer className="support-footer">
            <div>
              <strong>
                Trading AI
              </strong>

              <span>
                زیرساخت هوشمند برای تحلیل و معامله
              </span>
            </div>

            <div>
              مرکز پشتیبانی
              <span className="footer-dot">•</span>
              همیشه در دسترس
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .support-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 85% 5%,
              rgba(32, 211, 238, 0.09),
              transparent 27%
            ),
            radial-gradient(
              circle at 10% 35%,
              rgba(102, 75, 255, 0.08),
              transparent 28%
            ),
            #050b15;
          color: #f5f8ff;
          font-family:
            Arial,
            Tahoma,
            sans-serif;
        }

        .ambient {
          position: fixed;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.13;
          pointer-events: none;
        }

        .ambient-one {
          top: -240px;
          right: -150px;
          background: #18d7ef;
        }

        .ambient-two {
          bottom: -250px;
          left: -150px;
          background: #6b5cff;
        }

        .support-container {
          position: relative;
          z-index: 2;
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
          padding: 28px 0 50px;
        }

        .support-header {
          min-height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .brand-logo {
          width: 46px;
          height: 46px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              rgba(35, 213, 238, 0.2),
              rgba(93, 88, 255, 0.18)
            );
          border: 1px solid rgba(95, 220, 255, 0.18);
          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.2);
        }

        .brand-logo span {
          color: #4de4fa;
          font-size: 22px;
        }

        .brand-name {
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }

        .brand-subtitle {
          margin-top: 4px;
          color: #708097;
          font-size: 11px;
        }

        .refresh-button {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          color: #9aa9bd;
          border-radius: 13px;
          min-height: 43px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .refresh-button:hover {
          color: white;
          border-color: rgba(61, 220, 245, 0.25);
          background: rgba(61, 220, 245, 0.07);
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .refresh-icon {
          font-size: 18px;
        }

        .spinning {
          animation: spin 0.8s linear infinite;
        }

        .support-hero {
          position: relative;
          min-height: 385px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 50px 55px;
          border-radius: 30px;
          border: 1px solid rgba(103, 220, 255, 0.11);
          background:
            linear-gradient(
              120deg,
              rgba(13, 30, 51, 0.96),
              rgba(7, 18, 32, 0.92)
            );
          box-shadow:
            0 35px 90px rgba(0, 0, 0, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .support-hero:before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(47, 219, 242, 0.025)
            );
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 3;
          width: 57%;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          color: #66e8fa;
          background: rgba(41, 215, 239, 0.07);
          border: 1px solid rgba(75, 222, 245, 0.15);
          font-size: 11px;
          font-weight: 700;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #38e9a3;
          box-shadow: 0 0 12px #38e9a3;
        }

        .hero-content h1 {
          margin: 22px 0 15px;
          font-size: clamp(34px, 5vw, 57px);
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -1.5px;
        }

        .hero-content h1 span {
          color: #3cddf4;
        }

        .hero-content p {
          max-width: 620px;
          margin: 0;
          color: #8c9bb0;
          font-size: 15px;
          line-height: 2;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 28px;
          flex-wrap: wrap;
        }

        .primary-action,
        .secondary-action {
          border-radius: 13px;
          min-height: 47px;
          padding: 0 18px;
          font-family: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .primary-action {
          border: 0;
          color: #03131c;
          background: #32d7ed;
          box-shadow:
            0 12px 28px rgba(50, 215, 237, 0.15);
        }

        .primary-action:hover {
          transform: translateY(-2px);
          background: #5ae4f4;
        }

        .secondary-action {
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.035);
          color: #b5c1d0;
        }

        .secondary-action:hover {
          border-color: rgba(55, 221, 243, 0.25);
          color: #60e6f7;
        }

        .hero-visual {
          position: relative;
          width: 340px;
          height: 300px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orbit {
          position: absolute;
          border: 1px solid rgba(65, 222, 244, 0.1);
          border-radius: 50%;
        }

        .orbit-one {
          width: 270px;
          height: 270px;
        }

        .orbit-two {
          width: 205px;
          height: 205px;
        }

        .hero-orb {
          position: relative;
          z-index: 2;
          width: 155px;
          height: 155px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle,
              rgba(43, 224, 244, 0.16),
              rgba(9, 25, 42, 0.95) 67%
            );
          border: 1px solid rgba(70, 226, 244, 0.24);
          box-shadow:
            0 0 70px rgba(35, 218, 239, 0.1),
            inset 0 0 40px rgba(50, 221, 241, 0.04);
        }

        .orb-icon {
          color: #42e1f5;
          font-size: 30px;
          margin-bottom: 4px;
        }

        .orb-title {
          color: white;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .orb-status {
          margin-top: 6px;
          color: #54d9ed;
          font-size: 9px;
        }

        .floating-card {
          position: absolute;
          z-index: 4;
          padding: 9px 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 11px;
          background: rgba(10, 25, 42, 0.82);
          backdrop-filter: blur(12px);
          color: #a9b8c9;
          font-size: 10px;
          box-shadow: 0 14px 35px rgba(0, 0, 0, 0.25);
        }

        .floating-card span {
          margin-left: 5px;
          color: #40dfaa;
        }

        .floating-top {
          top: 25px;
          right: 8px;
        }

        .floating-bottom {
          bottom: 30px;
          left: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px;
          margin-top: 14px;
        }

        .stat-card {
          min-height: 96px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: rgba(9, 20, 34, 0.88);
        }

        .stat-icon {
          width: 45px;
          height: 45px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .stat-icon.blue {
          color: #5fdcf3;
          background: rgba(55, 211, 237, 0.08);
        }

        .stat-icon.green {
          color: #42e1a1;
          background: rgba(53, 226, 158, 0.08);
        }

        .stat-icon.purple {
          color: #a99bff;
          background: rgba(127, 105, 255, 0.08);
        }

        .stat-icon.cyan {
          color: #55e4ed;
          background: rgba(43, 215, 229, 0.08);
        }

        .stat-info {
          min-width: 0;
        }

        .stat-info span {
          display: block;
          color: #65758a;
          font-size: 11px;
          margin-bottom: 7px;
        }

        .stat-info strong {
          display: block;
          color: #eef4fb;
          font-size: 19px;
          font-weight: 900;
        }

        .online-text {
          color: #45df9e !important;
          font-size: 14px !important;
        }

        .section-block {
          margin-top: 22px;
          padding: 28px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: rgba(8, 19, 33, 0.88);
          box-shadow: 0 22px 65px rgba(0, 0, 0, 0.15);
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .section-kicker,
        .panel-kicker {
          color: #3ed9ee;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 7px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 950;
        }

        .section-heading p {
          margin: 8px 0 0;
          color: #65758a;
          font-size: 12px;
        }

        .section-count {
          border: 1px solid rgba(55, 217, 238, 0.13);
          background: rgba(44, 216, 239, 0.055);
          color: #57dff0;
          border-radius: 10px;
          padding: 8px 11px;
          font-size: 11px;
          white-space: nowrap;
        }

        .announcement-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
        }

        .announcement-card {
          padding: 20px;
          min-height: 205px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background:
            linear-gradient(
              145deg,
              rgba(17, 34, 55, 0.78),
              rgba(9, 21, 36, 0.78)
            );
          transition: 0.2s ease;
        }

        .announcement-card:hover {
          transform: translateY(-2px);
          border-color: rgba(55, 218, 240, 0.16);
        }

        .announcement-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .announcement-icon {
          width: 39px;
          height: 39px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52e1f3;
          background: rgba(45, 215, 238, 0.08);
        }

        .priority {
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 9px;
        }

        .priority-high {
          color: #ff9b9b;
          background: rgba(255, 82, 82, 0.08);
        }

        .priority-normal {
          color: #65e3f1;
          background: rgba(52, 217, 238, 0.07);
        }

        .priority-low {
          color: #94a3b8;
          background: rgba(148, 163, 184, 0.07);
        }

        .announcement-card h3 {
          margin: 18px 0 9px;
          font-size: 16px;
          line-height: 1.6;
        }

        .announcement-card p {
          min-height: 55px;
          margin: 0;
          color: #7c8ba0;
          font-size: 12px;
          line-height: 1.9;
        }

        .announcement-date {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.045);
          color: #526276;
          font-size: 9px;
        }

        .latest-announcement {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-top: 13px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid rgba(244, 186, 65, 0.11);
          background: rgba(240, 180, 55, 0.035);
        }

        .latest-icon {
          width: 35px;
          height: 35px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f0c56c;
          background: rgba(240, 180, 55, 0.08);
          font-weight: 900;
        }

        .latest-announcement div:nth-child(2) {
          min-width: 0;
          flex: 1;
        }

        .latest-announcement strong,
        .latest-announcement span {
          display: block;
        }

        .latest-announcement strong {
          color: #d8a94f;
          font-size: 9px;
          margin-bottom: 4px;
        }

        .latest-announcement span {
          color: #9aa8ba;
          font-size: 11px;
        }

        .latest-arrow {
          color: #7f8ca0;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 22px;
        }

        .panel {
          min-width: 0;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: rgba(8, 19, 33, 0.92);
          overflow: hidden;
          box-shadow: 0 22px 65px rgba(0, 0, 0, 0.15);
        }

        .panel-header {
          min-height: 82px;
          padding: 19px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .panel-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .panel-icon {
          width: 43px;
          height: 43px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .chat-icon {
          color: #4be1f4;
          background: rgba(45, 217, 239, 0.08);
        }

        .ticket-icon {
          color: #9f91ff;
          background: rgba(120, 99, 255, 0.08);
        }

        .panel-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
        }

        .live-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #42dda0;
          font-size: 9px;
          border-radius: 999px;
          padding: 6px 9px;
          background: rgba(56, 221, 160, 0.06);
        }

        .live-pill span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #40dda0;
          box-shadow: 0 0 8px #40dda0;
        }

        .chat-description {
          padding: 15px 22px 0;
          color: #65758a;
          font-size: 11px;
          line-height: 1.9;
        }

        .chat-window {
          height: 320px;
          overflow-y: auto;
          padding: 17px 20px;
          scrollbar-width: thin;
          scrollbar-color: #24354c transparent;
        }

        .message-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 13px;
        }

        .user-row {
          justify-content: flex-start;
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #4be2f3;
          background: rgba(48, 216, 239, 0.08);
          border: 1px solid rgba(48, 216, 239, 0.08);
          font-size: 12px;
        }

        .message-bubble {
          max-width: 82%;
          padding: 11px 13px;
          border-radius: 14px 14px 14px 4px;
          background: #101e30;
          border: 1px solid rgba(255, 255, 255, 0.045);
        }

        .user-bubble {
          border-radius: 14px 14px 4px 14px;
          background: rgba(42, 207, 232, 0.09);
          border-color: rgba(42, 207, 232, 0.1);
        }

        .message-text {
          white-space: pre-line;
          color: #b4c0cf;
          font-size: 11px;
          line-height: 1.95;
        }

        .user-bubble .message-text {
          color: #bfeaf1;
        }

        .message-time {
          margin-top: 6px;
          color: #506075;
          font-size: 8px;
        }

        .quick-questions {
          display: flex;
          gap: 6px;
          padding: 0 18px 13px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .quick-questions::-webkit-scrollbar {
          display: none;
        }

        .quick-questions button {
          flex: 0 0 auto;
          padding: 7px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.025);
          color: #75869b;
          font-family: inherit;
          font-size: 8px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .quick-questions button:hover {
          color: #54e1f1;
          border-color: rgba(58, 219, 239, 0.17);
        }

        .chat-input-area {
          display: flex;
          gap: 7px;
          padding: 13px 16px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.045);
        }

        .chat-input-area input {
          min-width: 0;
          flex: 1;
          height: 45px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 13px;
          background: #071321;
          color: white;
          padding: 0 13px;
          outline: none;
          font-family: inherit;
          font-size: 11px;
        }

        .chat-input-area input::placeholder,
        .ticket-form input::placeholder,
        .ticket-form textarea::placeholder {
          color: #4e5e73;
        }

        .chat-input-area input:focus,
        .ticket-form input:focus,
        .ticket-form textarea:focus {
          border-color: rgba(54, 220, 241, 0.28);
          box-shadow: 0 0 0 3px rgba(54, 220, 241, 0.035);
        }

        .chat-input-area button {
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          border: 0;
          border-radius: 13px;
          color: #021219;
          background: #36d8ec;
          font-size: 21px;
          font-weight: 900;
          cursor: pointer;
        }

        .chat-input-area button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 18px;
        }

        .typing span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #5bddec;
          animation: typing 1s infinite;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }

        .ticket-intro {
          display: flex;
          gap: 12px;
          margin: 18px 22px;
          padding: 14px;
          border-radius: 15px;
          background: rgba(123, 106, 255, 0.035);
          border: 1px solid rgba(123, 106, 255, 0.08);
        }

        .intro-number {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          color: #a89cff;
          background: rgba(123, 106, 255, 0.09);
          font-size: 9px;
          font-weight: 900;
        }

        .ticket-intro strong {
          display: block;
          color: #c1c9d5;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .ticket-intro p {
          margin: 0;
          color: #66758a;
          font-size: 9px;
          line-height: 1.8;
        }

        .ticket-form {
          padding: 0 22px 22px;
        }

        .ticket-form label {
          display: block;
          margin-bottom: 13px;
        }

        .ticket-form label > span {
          display: block;
          margin-bottom: 7px;
          color: #7e8da1;
          font-size: 10px;
        }

        .ticket-form input,
        .ticket-form textarea {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 13px;
          background: #071321;
          color: #edf4fb;
          padding: 12px 13px;
          outline: none;
          font-family: inherit;
          font-size: 11px;
          transition: 0.2s ease;
        }

        .ticket-form input {
          height: 45px;
        }

        .ticket-form textarea {
          min-height: 125px;
          resize: vertical;
          line-height: 1.9;
        }

        .form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 5px;
        }

        .form-footer > span {
          max-width: 50%;
          color: #536277;
          font-size: 8px;
          line-height: 1.7;
        }

        .form-footer button {
          min-height: 44px;
          border: 0;
          border-radius: 12px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #071018;
          background: #9d91ff;
          font-family: inherit;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .form-footer button:hover {
          background: #b0a6ff;
          transform: translateY(-1px);
        }

        .form-footer button:disabled {
          opacity: 0.55;
          cursor: wait;
          transform: none;
        }

        .small-loader {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(0, 0, 0, 0.25);
          border-top-color: #10131e;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .tickets-list {
          display: grid;
          gap: 10px;
        }

        .ticket-card {
          min-width: 0;
          display: grid;
          grid-template-columns: 110px minmax(0, 1fr) 35px;
          align-items: center;
          gap: 18px;
          padding: 17px;
          border-radius: 17px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(11, 25, 41, 0.74);
          transition: 0.2s ease;
        }

        .ticket-card:hover {
          border-color: rgba(57, 220, 240, 0.12);
          transform: translateY(-1px);
        }

        .ticket-status {
          width: fit-content;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          color: #62dca7;
          background: rgba(55, 219, 158, 0.055);
          font-size: 9px;
        }

        .status-indicator {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #46dda0;
        }

        .status-closed {
          background: #667085;
        }

        .status-in_progress {
          background: #e4b64d;
        }

        .status-answered {
          background: #56dff2;
        }

        .ticket-main {
          min-width: 0;
        }

        .ticket-id {
          color: #526177;
          font-size: 8px;
          margin-bottom: 5px;
        }

        .ticket-id span {
          color: #6b7a8e;
          margin-right: 5px;
          direction: ltr;
        }

        .ticket-main h3 {
          overflow: hidden;
          margin: 0 0 6px;
          color: #dce4ef;
          font-size: 13px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .ticket-main p {
          overflow: hidden;
          margin: 0;
          color: #67778c;
          font-size: 9px;
          line-height: 1.8;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .ticket-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 7px;
          color: #4d5d72;
          font-size: 8px;
        }

        .ticket-arrow {
          color: #526177;
          font-size: 18px;
        }

        .outline-button {
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
          color: #75869b;
          font-family: inherit;
          font-size: 9px;
          cursor: pointer;
        }

        .outline-button:hover {
          color: #58dfef;
          border-color: rgba(58, 219, 239, 0.16);
        }

        .help-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
          margin-top: 22px;
        }

        .help-card {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          padding: 17px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(8, 19, 33, 0.78);
        }

        .help-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          color: #53deef;
          background: rgba(50, 218, 239, 0.07);
        }

        .purple-help {
          color: #aa9fff;
          background: rgba(125, 105, 255, 0.07);
        }

        .green-help {
          color: #4de0a2;
          background: rgba(60, 221, 159, 0.07);
        }

        .help-card > div:nth-child(2) {
          min-width: 0;
          flex: 1;
        }

        .help-card h3 {
          margin: 0 0 5px;
          color: #dbe3ee;
          font-size: 11px;
        }

        .help-card p {
          margin: 0;
          color: #59697d;
          font-size: 8px;
          line-height: 1.8;
        }

        .help-card > span:last-child {
          color: #526177;
        }

        .loading-box,
        .empty-box {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px dashed rgba(255, 255, 255, 0.07);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.012);
          color: #637389;
          font-size: 11px;
        }

        .loader {
          width: 25px;
          height: 25px;
          margin-bottom: 12px;
          border-radius: 50%;
          border: 2px solid rgba(55, 219, 239, 0.13);
          border-top-color: #45deef;
          animation: spin 0.7s linear infinite;
        }

        .empty-icon {
          color: #4c6178;
          font-size: 32px;
          margin-bottom: 10px;
        }

        .empty-box h3 {
          margin: 0 0 7px;
          color: #a4b1c1;
          font-size: 13px;
        }

        .empty-box p {
          margin: 0;
          color: #526176;
          font-size: 9px;
        }

        .ticket-empty button {
          margin-top: 16px;
          min-height: 38px;
          padding: 0 13px;
          border: 1px solid rgba(57, 220, 240, 0.12);
          border-radius: 10px;
          color: #5de0ef;
          background: rgba(57, 220, 240, 0.05);
          font-family: inherit;
          font-size: 9px;
          cursor: pointer;
        }

        .support-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 25px 4px 0;
          color: #45556a;
          font-size: 9px;
        }

        .support-footer strong {
          color: #7b899b;
          display: block;
          margin-bottom: 4px;
          font-size: 11px;
        }

        .support-footer span {
          color: #45556a;
        }

        .footer-dot {
          padding: 0 7px;
          color: #304156 !important;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes typing {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }

          50% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        @media (max-width: 900px) {
          .support-hero {
            padding: 38px 32px;
          }

          .hero-content {
            width: 60%;
          }

          .hero-visual {
            width: 280px;
          }

          .announcement-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .help-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .support-container {
            width: min(100% - 20px, 560px);
            padding-top: 14px;
            padding-bottom: 30px;
          }

          .support-header {
            min-height: 58px;
            margin-bottom: 12px;
          }

          .brand-logo {
            width: 40px;
            height: 40px;
          }

          .brand-name {
            font-size: 16px;
          }

          .brand-subtitle {
            font-size: 9px;
          }

          .refresh-button {
            width: 42px;
            padding: 0;
            justify-content: center;
            font-size: 0;
          }

          .refresh-icon {
            font-size: 18px;
          }

          .support-hero {
            min-height: auto;
            display: block;
            padding: 29px 22px 25px;
            border-radius: 23px;
          }

          .hero-content {
            width: 100%;
          }

          .hero-content h1 {
            margin-top: 18px;
            font-size: 35px;
            letter-spacing: -1px;
          }

          .hero-content p {
            font-size: 12px;
            line-height: 2;
          }

          .hero-actions {
            margin-top: 21px;
          }

          .primary-action,
          .secondary-action {
            flex: 1;
            min-width: 0;
            padding: 0 11px;
            font-size: 10px;
          }

          .hero-visual {
            width: 100%;
            height: 190px;
            margin-top: 14px;
          }

          .hero-orb {
            width: 115px;
            height: 115px;
          }

          .orbit-one {
            width: 190px;
            height: 190px;
          }

          .orbit-two {
            width: 145px;
            height: 145px;
          }

          .orb-icon {
            font-size: 23px;
          }

          .orb-title {
            font-size: 10px;
          }

          .floating-card {
            font-size: 8px;
          }

          .floating-top {
            top: 6px;
            right: 0;
          }

          .floating-bottom {
            bottom: 8px;
            left: 0;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 9px;
          }

          .stat-card {
            min-height: 80px;
            padding: 12px;
            border-radius: 15px;
            gap: 9px;
          }

          .stat-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            font-size: 15px;
          }

          .stat-info span {
            font-size: 8px;
            margin-bottom: 5px;
          }

          .stat-info strong {
            font-size: 15px;
          }

          .section-block {
            margin-top: 12px;
            padding: 18px 13px;
            border-radius: 20px;
          }

          .section-heading {
            align-items: flex-start;
            margin-bottom: 15px;
          }

          .section-heading h2 {
            font-size: 19px;
          }

          .section-heading p {
            max-width: 230px;
            line-height: 1.8;
          }

          .announcement-grid {
            grid-template-columns: 1fr;
          }

          .announcement-card {
            min-height: 0;
          }

          .main-grid {
            gap: 12px;
            margin-top: 12px;
          }

          .panel {
            border-radius: 20px;
          }

          .panel-header {
            min-height: 72px;
            padding: 15px;
          }

          .panel-icon {
            width: 38px;
            height: 38px;
          }

          .panel-header h2 {
            font-size: 15px;
          }

          .chat-description {
            padding: 13px 15px 0;
          }

          .chat-window {
            height: 320px;
            padding: 15px 12px;
          }

          .message-bubble {
            max-width: 87%;
          }

          .quick-questions {
            padding: 0 12px 10px;
          }

          .chat-input-area {
            padding: 11px 12px 13px;
          }

          .ticket-intro {
            margin: 14px 15px;
          }

          .ticket-form {
            padding: 0 15px 17px;
          }

          .form-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .form-footer > span {
            max-width: 100%;
          }

          .form-footer button {
            width: 100%;
            justify-content: center;
          }

          .ticket-card {
            grid-template-columns: 1fr auto;
            gap: 10px;
            padding: 14px;
          }

          .ticket-status {
            grid-column: 1 / -1;
          }

          .ticket-main h3 {
            font-size: 12px;
          }

          .ticket-main p {
            white-space: normal;
          }

          .ticket-arrow {
            grid-column: 2;
            grid-row: 2;
          }

          .help-card {
            padding: 14px;
          }

          .support-footer {
            flex-direction: column;
            align-items: flex-start;
            padding-top: 20px;
          }
        }

        @media (max-width: 390px) {
          .support-container {
            width: calc(100% - 14px);
          }

          .support-hero {
            padding-left: 17px;
            padding-right: 17px;
          }

          .hero-content h1 {
            font-size: 31px;
          }

          .primary-action,
          .secondary-action {
            width: 100%;
            flex: none;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .stat-card {
            padding: 10px;
          }

          .stat-info span {
            font-size: 7px;
          }

          .stat-info strong {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}
