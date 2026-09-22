import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Icon({
  name,
  size = 18,
}: {
  name:
    | "dashboard"
    | "market"
    | "bot"
    | "ai"
    | "news"
    | "economic"
    | "broker"
    | "wallet"
    | "support"
    | "settings"
    | "plus"
    | "send"
    | "message"
    | "clock"
    | "check"
    | "shield"
    | "user"
    | "arrow";
  size?: number;
}) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),

    market: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h17" />
        <path d="m7 15 4-5 3 3 5-8" />
      </>
    ),

    bot: (
      <>
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 3v4" />
        <path d="M8 12h.01" />
        <path d="M16 12h.01" />
        <path d="M8 16h8" />
      </>
    ),

    ai: (
      <>
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <path d="m5 5 14 14" />
        <path d="M19 5 5 19" />
      </>
    ),

    news: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),

    economic: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M7 2v4" />
        <path d="M17 2v4" />
        <path d="M3 9h18" />
        <path d="M8 13h3" />
        <path d="M13 13h3" />
        <path d="M8 17h3" />
      </>
    ),

    broker: (
      <>
        <rect x="3" y="5" width="7" height="6" rx="1.5" />
        <rect x="14" y="13" width="7" height="6" rx="1.5" />
        <path d="M10 8h4" />
        <path d="m12 6 2 2-2 2" />
        <path d="M14 16h-4" />
        <path d="m12 14-2 2 2 2" />
      </>
    ),

    wallet: (
      <>
        <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
        <path d="M4 7h16v12H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
        <path d="M16 13h4" />
      </>
    ),

    support: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0v5H4z" />
        <path d="M4 15H2v-2" />
        <path d="M20 15h2v-2" />
        <path d="M9 21h6" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.6V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6h-.2a1.7 1.7 0 0 0-1.6 1.4Z" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),

    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),

    message: (
      <>
        <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.4 8.4 0 0 1-3.5-.8L4 20l1.4-3.7A7.4 7.4 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </>
    ),

    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),

    shield: (
      <>
        <path d="M12 3 20 6v5c0 5-3.2 8.5-8 10-4.8-1.5-8-5-8-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),

    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

function dateText(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: string) {
  if (status === "OPEN") return "باز";
  if (status === "CLOSED") return "بسته شده";
  if (status === "ANSWERED") return "پاسخ داده شده";
  if (status === "PENDING") return "در انتظار پاسخ";
  return status;
}

function statusClass(status: string) {
  if (status === "CLOSED") return "closed";
  if (status === "ANSWERED") return "answered";
  if (status === "PENDING") return "pending";
  return "open";
}

async function createTicket(formData: FormData) {
  "use server";

  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (subject.length < 3 || subject.length > 120) {
    redirect("/support?error=subject");
  }

  if (message.length < 5 || message.length > 5000) {
    redirect("/support?error=message");
  }

  const finalSubject = category
    ? `[${category}] ${subject}`
    : subject;

  await prisma.supportTicket.create({
    data: {
      userId: session.userId,
      subject: finalSubject,
      status: "OPEN",
      messages: {
        create: {
          senderId: session.userId,
          senderType: "USER",
          message,
        },
      },
    },
  });

  redirect("/support?created=1");
}

async function replyToTicket(formData: FormData) {
  "use server";

  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!ticketId || message.length < 2 || message.length > 5000) {
    redirect("/support?error=reply");
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      userId: session.userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!ticket) {
    redirect("/support?error=ticket");
  }

  if (ticket.status === "CLOSED") {
    redirect("/support?error=closed");
  }

  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: session.userId,
      senderType: "USER",
      message,
    },
  });

  await prisma.supportTicket.update({
    where: {
      id: ticket.id,
    },
    data: {
      status: "OPEN",
    },
  });

  redirect("/support?replied=1");
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<{
    created?: string;
    replied?: string;
    error?: string;
  }>;
}) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const params = searchParams ? await searchParams : {};

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const tickets = await prisma.supportTicket.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        take: 50,
      },
    },
  });

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) => ticket.status !== "CLOSED"
  ).length;

  const closedTickets = tickets.filter(
    (ticket) => ticket.status === "CLOSED"
  ).length;

  const answeredTickets = tickets.filter((ticket) =>
    ticket.messages.some(
      (message) =>
        message.senderType === "ADMIN" ||
        message.senderType === "SUPPORT"
    )
  ).length;

  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  let errorText = "";

  if (params.error === "subject") {
    errorText = "عنوان درخواست باید بین ۳ تا ۱۲۰ کاراکتر باشد.";
  }

  if (params.error === "message") {
    errorText = "متن درخواست باید بین ۵ تا ۵۰۰۰ کاراکتر باشد.";
  }

  if (params.error === "reply") {
    errorText = "متن پاسخ معتبر نیست.";
  }

  if (params.error === "ticket") {
    errorText = "درخواست موردنظر پیدا نشد.";
  }

  if (params.error === "closed") {
    errorText = "این درخواست بسته شده و امکان ارسال پیام جدید ندارد.";
  }

  return (
    <main dir="rtl" className="support-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        :root {
          color-scheme: dark;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #030303;
          color: #f7f2e7;
          font-family: Tahoma, Arial, sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        .support-page {
          min-height: 100vh;
          padding: 18px;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(212, 175, 55, 0.12),
              transparent 28%
            ),
            radial-gradient(
              circle at 0% 100%,
              rgba(212, 175, 55, 0.055),
              transparent 32%
            ),
            #030303;
        }

        .app {
          width: min(1500px, 100%);
          margin: auto;
          display: grid;
          grid-template-columns: 255px minmax(0, 1fr);
          gap: 18px;
          direction: ltr;
        }

        .sidebar,
        .content {
          direction: rtl;
          min-width: 0;
        }

        .glass {
          background:
            linear-gradient(
              145deg,
              rgba(24, 24, 22, 0.82),
              rgba(8, 8, 8, 0.90)
            );
          border: 1px solid rgba(212, 175, 55, 0.13);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(20px);
        }

        .sidebar {
          position: sticky;
          top: 18px;
          height: calc(100vh - 36px);
          overflow-y: auto;
          padding: 18px;
          border-radius: 26px;
          background:
            linear-gradient(
              180deg,
              rgba(19, 19, 18, 0.97),
              rgba(7, 7, 7, 0.98)
            );
          border: 1px solid rgba(212, 175, 55, 0.12);
          box-shadow: 0 25px 75px rgba(0, 0, 0, 0.4);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 3px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .brand-logo {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          flex: 0 0 46px;
          border-radius: 15px;
          color: #080706;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 1px;
          background:
            linear-gradient(
              135deg,
              #f8e39a,
              #d4af37 48%,
              #8e6815
            );
          box-shadow:
            0 12px 32px rgba(212, 175, 55, 0.17),
            inset 0 1px 0 rgba(255, 255, 255, 0.55);
        }

        .brand strong {
          display: block;
          color: #fff;
          font-size: 16px;
        }

        .brand small {
          display: block;
          margin-top: 5px;
          color: #68645d;
          font-size: 8px;
          letter-spacing: 0.8px;
        }

        .nav-title {
          margin: 23px 7px 10px;
          color: #625e57;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .nav {
          display: grid;
          gap: 5px;
        }

        .nav a {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 11px;
          color: #89847b;
          border: 1px solid transparent;
          border-radius: 13px;
          font-size: 10px;
          transition: 0.2s ease;
        }

        .nav a svg {
          color: #6e6960;
        }

        .nav a:hover {
          color: #e9d28a;
          background: rgba(212, 175, 55, 0.04);
          border-color: rgba(212, 175, 55, 0.08);
        }

        .nav a.active {
          color: #f0d46e;
          background:
            linear-gradient(
              90deg,
              rgba(212, 175, 55, 0.15),
              rgba(212, 175, 55, 0.025)
            );
          border-color: rgba(212, 175, 55, 0.16);
          box-shadow: inset -2px 0 #d4af37;
        }

        .nav a.active svg {
          color: #d4af37;
        }

        .security {
          margin-top: 22px;
          padding-top: 17px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }

        .security-card {
          padding: 15px;
          border-radius: 17px;
          border: 1px solid rgba(212, 175, 55, 0.12);
          background: rgba(212, 175, 55, 0.035);
        }

        .security-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #d9b84b;
          font-size: 10px;
          font-weight: 800;
        }

        .security-card p {
          margin: 9px 0 0;
          color: #6f6a62;
          font-size: 8px;
          line-height: 2;
        }

        .content {
          min-width: 0;
        }

        .topbar {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 18px;
          border-radius: 21px;
        }

        .eyebrow {
          margin-bottom: 7px;
          color: #b89023;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .topbar h1 {
          margin: 0;
          color: #fff;
          font-size: 22px;
        }

        .topbar p {
          margin: 6px 0 0;
          color: #6e6a62;
          font-size: 9px;
        }

        .top-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border-radius: 999px;
          border: 1px solid rgba(212, 175, 55, 0.13);
          color: #9a948a;
          background: rgba(212, 175, 55, 0.025);
          font-size: 8px;
        }

        .online i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #55c879;
          box-shadow: 0 0 10px #55c879;
        }

        .avatar {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #080706;
          font-size: 11px;
          font-weight: 900;
          background:
            linear-gradient(
              135deg,
              #f3d878,
              #c89c2c
            );
        }

        .hero {
          position: relative;
          overflow: hidden;
          margin-top: 15px;
          padding: 27px;
          border-radius: 24px;
        }

        .hero:before {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          left: -130px;
          bottom: -190px;
          border: 1px solid rgba(212, 175, 55, 0.12);
          border-radius: 50%;
          box-shadow:
            0 0 0 40px rgba(212, 175, 55, 0.025),
            0 0 0 80px rgba(212, 175, 55, 0.015);
        }

        .hero-inner {
          position: relative;
          z-index: 2;
          max-width: 900px;
        }

        .pill {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          color: #d8b548;
          background: rgba(212, 175, 55, 0.045);
          border: 1px solid rgba(212, 175, 55, 0.15);
          font-size: 8px;
          font-weight: 800;
        }

        .pill i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d4af37;
          box-shadow: 0 0 9px rgba(212, 175, 55, 0.8);
        }

        .hero h2 {
          margin: 17px 0 9px;
          color: #fff;
          font-size: clamp(24px, 4vw, 36px);
          line-height: 1.45;
        }

        .hero h2 span {
          color: #d4af37;
        }

        .hero p {
          max-width: 760px;
          margin: 0;
          color: #817c72;
          font-size: 10px;
          line-height: 2.15;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
        }

        .hero-btn {
          min-height: 41px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 15px;
          border-radius: 11px;
          border: 1px solid rgba(212, 175, 55, 0.13);
          color: #a8a196;
          background: rgba(255, 255, 255, 0.018);
          font-size: 9px;
        }

        .hero-btn.primary {
          color: #080706;
          border-color: transparent;
          background:
            linear-gradient(
              135deg,
              #f3d876,
              #c79a29
            );
          font-weight: 900;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 11px;
          margin-top: 11px;
        }

        .stat {
          min-height: 96px;
          padding: 15px;
          border-radius: 18px;
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          margin-bottom: 10px;
          border-radius: 10px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.065);
        }

        .stat small {
          display: block;
          color: #6d6860;
          font-size: 8px;
        }

        .stat strong {
          display: block;
          margin-top: 5px;
          color: #eee9df;
          font-size: 20px;
        }

        .workspace {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
          gap: 11px;
          margin-top: 11px;
          align-items: start;
        }

        .panel {
          border-radius: 20px;
          padding: 19px;
        }

        .panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 17px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .panel-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.06);
        }

        .panel h3 {
          margin: 0;
          color: #f3eee4;
          font-size: 12px;
        }

        .panel-title p {
          margin: 4px 0 0;
          color: #5e5a53;
          font-size: 8px;
        }

        .form {
          display: grid;
          gap: 10px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .field label {
          color: #aaa399;
          font-size: 8px;
        }

        .field input,
        .field textarea,
        .field select {
          width: 100%;
          outline: none;
          color: #e9e4da;
          background: #080808;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 11px;
          padding: 11px 12px;
          font-size: 9px;
          transition: 0.2s;
        }

        .field select {
          appearance: auto;
        }

        .field textarea {
          min-height: 130px;
          resize: vertical;
          line-height: 2;
        }

        .field input:focus,
        .field textarea:focus,
        .field select:focus {
          border-color: rgba(212, 175, 55, 0.42);
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.045);
        }

        .field input::placeholder,
        .field textarea::placeholder {
          color: #4c4944;
        }

        .counter {
          color: #4f4b45;
          font-size: 7px;
          text-align: left;
        }

        .submit {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 11px;
          color: #080706;
          background:
            linear-gradient(
              135deg,
              #f3d876,
              #c79a29
            );
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
          box-shadow: 0 12px 30px rgba(212, 175, 55, 0.11);
        }

        .privacy {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #55514b;
          font-size: 7px;
        }

        .tips {
          display: grid;
          gap: 8px;
        }

        .tip {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px;
          border: 1px solid rgba(255, 255, 255, 0.045);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.015);
        }

        .tip-icon {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          flex: 0 0 30px;
          border-radius: 9px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.06);
        }

        .tip strong {
          display: block;
          color: #c8c2b8;
          font-size: 8px;
        }

        .tip span {
          display: block;
          margin-top: 4px;
          color: #666159;
          font-size: 7px;
          line-height: 1.9;
        }

        .alerts {
          margin-top: 11px;
        }

        .alert {
          padding: 11px 13px;
          border-radius: 11px;
          font-size: 8px;
        }

        .alert.success {
          color: #a9d8ad;
          border: 1px solid rgba(74, 170, 88, 0.17);
          background: rgba(74, 170, 88, 0.045);
        }

        .alert.error {
          color: #e2aaaa;
          border: 1px solid rgba(220, 90, 90, 0.18);
          background: rgba(220, 90, 90, 0.045);
        }

        .tickets {
          margin-top: 11px;
        }

        .tickets-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 13px;
        }

        .tickets-head h3 {
          margin: 0;
          color: #f4efe7;
          font-size: 13px;
        }

        .ticket-count {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .count {
          padding: 5px 8px;
          border-radius: 7px;
          color: #777168;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: rgba(255, 255, 255, 0.015);
          font-size: 7px;
        }

        .count.active {
          color: #080706;
          border-color: transparent;
          background: #d4af37;
          font-weight: 900;
        }

        .ticket-list {
          display: grid;
          gap: 9px;
        }

        .ticket {
          overflow: hidden;
          border: 1px solid rgba(212, 175, 55, 0.085);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(20, 20, 18, 0.75),
              rgba(7, 7, 7, 0.8)
            );
        }

        .ticket-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          padding: 13px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.045);
        }

        .ticket-main {
          min-width: 0;
        }

        .ticket-main strong {
          display: block;
          overflow: hidden;
          color: #eee9df;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ticket-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 5px;
          color: #5d5952;
          font-size: 7px;
        }

        .badge {
          flex: 0 0 auto;
          padding: 6px 9px;
          border-radius: 999px;
          color: #d7b94e;
          border: 1px solid rgba(212, 175, 55, 0.14);
          background: rgba(212, 175, 55, 0.045);
          font-size: 7px;
        }

        .badge.answered {
          color: #a9d4ad;
          border-color: rgba(79, 165, 91, 0.15);
          background: rgba(79, 165, 91, 0.045);
        }

        .badge.closed {
          color: #767169;
          border-color: rgba(255, 255, 255, 0.055);
          background: rgba(255, 255, 255, 0.025);
        }

        .badge.pending {
          color: #d7bd74;
        }

        .messages {
          display: grid;
          gap: 7px;
          padding: 11px 13px;
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.045);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.012);
        }

        .message.admin {
          border-color: rgba(212, 175, 55, 0.10);
          background: rgba(212, 175, 55, 0.025);
        }

        .message-avatar {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          flex: 0 0 27px;
          border-radius: 9px;
          color: #080706;
          background: #b98b20;
          font-size: 8px;
          font-weight: 900;
        }

        .message.admin .message-avatar {
          color: #f7e5a4;
          background: rgba(212, 175, 55, 0.12);
        }

        .message-content {
          min-width: 0;
          flex: 1;
        }

        .message-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 4px;
        }

        .message-top strong {
          color: #aaa49a;
          font-size: 7px;
        }

        .message.admin .message-top strong {
          color: #d5b449;
        }

        .message-top span {
          color: #55514a;
          font-size: 7px;
        }

        .message-text {
          color: #8f8a81;
          font-size: 8px;
          line-height: 1.9;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .reply {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 42px;
          gap: 7px;
          padding: 0 13px 13px;
        }

        .reply input {
          width: 100%;
          height: 39px;
          outline: none;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          color: #eee8df;
          background: #070707;
          padding: 0 11px;
          font-size: 8px;
        }

        .reply input:focus {
          border-color: rgba(212, 175, 55, 0.4);
        }

        .reply button {
          height: 39px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(212, 175, 55, 0.17);
          border-radius: 10px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.055);
          cursor: pointer;
        }

        .closed-note {
          margin: 0 13px 13px;
          padding: 9px;
          border-radius: 9px;
          color: #5e5951;
          background: rgba(255, 255, 255, 0.018);
          text-align: center;
          font-size: 7px;
        }

        .empty {
          padding: 38px 20px;
          text-align: center;
          border: 1px dashed rgba(212, 175, 55, 0.12);
          border-radius: 15px;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin: auto auto 10px;
          border-radius: 15px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.055);
        }

        .empty strong {
          display: block;
          color: #a7a197;
          font-size: 9px;
        }

        .empty span {
          display: block;
          margin-top: 5px;
          color: #5c5851;
          font-size: 7px;
        }

        .footer {
          padding: 16px;
          text-align: center;
          color: #4d4943;
          font-size: 7px;
        }

        @media (max-width: 1100px) {
          .app {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .workspace {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .support-page {
            padding: 9px;
          }

          .topbar {
            padding: 14px;
          }

          .online {
            display: none;
          }

          .topbar h1 {
            font-size: 19px;
          }

          .hero {
            padding: 21px;
          }

          .hero h2 {
            font-size: 25px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .stat {
            min-height: 80px;
          }

          .panel {
            padding: 15px;
          }

          .tickets-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .ticket-count {
            justify-content: flex-start;
          }
        }

        @media (max-width: 480px) {
          .hero-actions {
            display: grid;
          }

          .hero-btn {
            width: 100%;
          }

          .ticket-head {
            flex-direction: column;
          }

          .badge {
            align-self: flex-start;
          }
        }
      `}</style>

      <div className="app">
        {/* SIDEBAR */}

        <aside className="sidebar">
          <Link href="/dashboard" className="brand">
            <div className="brand-logo">AI</div>

            <div>
              <strong>Trading AI</strong>
              <small>SMART TRADING PLATFORM</small>
            </div>
          </Link>

          <div className="nav-title">منوی اصلی</div>

          <nav className="nav">
            <Link href="/dashboard">
              <Icon name="dashboard" size={17} />
              داشبورد
            </Link>

            <Link href="/market">
              <Icon name="market" size={17} />
              بازار و نمودار
            </Link>

            <Link href="/bots">
              <Icon name="bot" size={17} />
              ربات‌های معاملاتی
            </Link>

            <Link href="/ai-analysis">
              <Icon name="ai" size={17} />
              تحلیل هوشمند AI
            </Link>

            <Link href="/news">
              <Icon name="news" size={17} />
              اخبار بازار
            </Link>

            <Link href="/broker">
              <Icon name="broker" size={17} />
              اتصال بروکر
            </Link>

            <Link href="/economic">
              <Icon name="economic" size={17} />
              تقویم اقتصادی
            </Link>

            <Link href="/payments">
              <Icon name="wallet" size={17} />
              کیف پول و پرداخت
            </Link>

            <Link href="/support" className="active">
              <Icon name="support" size={17} />
              پشتیبانی
            </Link>

            <Link href="/settings">
              <Icon name="settings" size={17} />
              تنظیمات
            </Link>
          </nav>

          <div className="security">
            <div className="security-card">
              <div className="security-title">
                <Icon name="shield" size={15} />
                پشتیبانی امن
              </div>

              <p>
                درخواست‌های شما مستقیماً به حساب کاربری متصل هستند و
                پاسخ‌های تیم پشتیبانی در همین بخش نمایش داده می‌شوند.
              </p>
            </div>
          </div>
        </aside>

        {/* CONTENT */}

        <section className="content">
          <header className="topbar glass">
            <div>
              <div className="eyebrow">
                TRADING AI SUPPORT CENTER
              </div>

              <h1>مرکز پشتیبانی</h1>

              <p>
                درخواست‌های خود را ثبت کنید و پاسخ آن‌ها را پیگیری کنید
              </p>
            </div>

            <div className="top-user">
              <div className="online">
                <i />
                سیستم فعال است
              </div>

              <div className="avatar">{initials}</div>
            </div>
          </header>

          {/* HERO */}

          <section className="hero glass">
            <div className="hero-inner">
              <div className="pill">
                <i />
                پشتیبانی آنلاین Trading AI
              </div>

              <h2>
                همیشه یک قدم
                <span> با شما</span>
              </h2>

              <p>
                برای مشکلات حساب، ربات‌های معاملاتی، تحلیل AI، سیگنال‌ها،
                پرداخت، اتصال بروکر و سایر سرویس‌های Trading AI یک
                درخواست ایجاد کنید. تمام گفتگوها در حساب شما ذخیره
                می‌شوند.
              </p>

              <div className="hero-actions">
                <a href="#new-ticket" className="hero-btn primary">
                  <Icon name="plus" size={15} />
                  ایجاد درخواست جدید
                </a>

                <a href="#tickets" className="hero-btn">
                  <Icon name="message" size={15} />
                  مشاهده درخواست‌ها
                </a>
              </div>
            </div>
          </section>

          {/* STATS */}

          <section className="stats">
            <div className="stat glass">
              <div className="stat-icon">
                <Icon name="message" size={16} />
              </div>

              <small>کل درخواست‌ها</small>

              <strong>
                {totalTickets.toLocaleString("fa-IR")}
              </strong>
            </div>

            <div className="stat glass">
              <div className="stat-icon">
                <Icon name="clock" size={16} />
              </div>

              <small>درخواست‌های باز</small>

              <strong>
                {openTickets.toLocaleString("fa-IR")}
              </strong>
            </div>

            <div className="stat glass">
              <div className="stat-icon">
                <Icon name="check" size={16} />
              </div>

              <small>پاسخ داده شده</small>

              <strong>
                {answeredTickets.toLocaleString("fa-IR")}
              </strong>
            </div>
          </section>

          {/* ALERTS */}

          {(params.created || params.replied || errorText) && (
            <div className="alerts">
              {params.created && (
                <div className="alert success">
                  درخواست شما با موفقیت ثبت شد و در حساب شما ذخیره شد.
                </div>
              )}

              {params.replied && (
                <div className="alert success">
                  پیام شما با موفقیت به درخواست پشتیبانی اضافه شد.
                </div>
              )}

              {errorText && (
                <div className="alert error">
                  {errorText}
                </div>
              )}
            </div>
          )}

          {/* WORKSPACE */}

          <section className="workspace" id="new-ticket">
            {/* NEW TICKET */}

            <div className="panel glass">
              <div className="panel-head">
                <div className="panel-title">
                  <div className="panel-icon">
                    <Icon name="plus" size={17} />
                  </div>

                  <div>
                    <h3>ایجاد درخواست جدید</h3>
                    <p>
                      اطلاعات مشکل را دقیق وارد کنید
                    </p>
                  </div>
                </div>
              </div>

              <form action={createTicket} className="form">
                <div className="field">
                  <label htmlFor="subject">
                    موضوع درخواست
                  </label>

                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    maxLength={120}
                    required
                    placeholder="مثلاً مشکل در اتصال ربات به حساب"
                  />
                </div>

                <div className="field">
                  <label htmlFor="category">
                    دسته‌بندی
                  </label>

                  <select
                    id="category"
                    name="category"
                    defaultValue=""
                  >
                    <option value="">
                      انتخاب دسته‌بندی
                    </option>

                    <option value="حساب کاربری">
                      حساب کاربری
                    </option>

                    <option value="ربات معاملاتی">
                      ربات معاملاتی
                    </option>

                    <option value="تحلیل AI">
                      تحلیل AI
                    </option>

                    <option value="سیگنال">
                      سیگنال
                    </option>

                    <option value="بروکر">
                      اتصال بروکر
                    </option>

                    <option value="پرداخت">
                      پرداخت
                    </option>

                    <option value="تلگرام">
                      تلگرام
                    </option>

                    <option value="سایر">
                      سایر
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="message">
                    توضیحات کامل
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    maxLength={5000}
                    required
                    placeholder="مشکل یا سوال خود را با جزئیات توضیح دهید..."
                  />

                  <div className="counter">
                    حداکثر ۵۰۰۰ کاراکتر
                  </div>
                </div>

                <button type="submit" className="submit">
                  <Icon name="send" size={15} />
                  ارسال درخواست
                </button>

                <div className="privacy">
                  <Icon name="shield" size={11} />
                  اطلاعات درخواست شما فقط در حساب کاربری شما ذخیره می‌شود.
                </div>
              </form>
            </div>

            {/* TIPS */}

            <div className="panel glass">
              <div className="panel-head">
                <div className="panel-title">
                  <div className="panel-icon">
                    <Icon name="shield" size={17} />
                  </div>

                  <div>
                    <h3>نکات قبل از ارسال</h3>
                    <p>
                      برای پاسخ سریع‌تر و دقیق‌تر
                    </p>
                  </div>
                </div>
              </div>

              <div className="tips">
                <div className="tip">
                  <div className="tip-icon">
                    <Icon name="message" size={14} />
                  </div>

                  <div>
                    <strong>
                      موضوع را واضح بنویسید
                    </strong>

                    <span>
                      عنوان دقیق باعث می‌شود درخواست سریع‌تر
                      شناسایی و بررسی شود.
                    </span>
                  </div>
                </div>

                <div className="tip">
                  <div className="tip-icon">
                    <Icon name="clock" size={14} />
                  </div>

                  <div>
                    <strong>
                      یک درخواست را ادامه دهید
                    </strong>

                    <span>
                      برای یک مشکل چند تیکت مشابه ایجاد نکنید و
                      از همان درخواست پاسخ دهید.
                    </span>
                  </div>
                </div>

                <div className="tip">
                  <div className="tip-icon">
                    <Icon name="check" size={14} />
                  </div>

                  <div>
                    <strong>
                      جزئیات کافی ارائه دهید
                    </strong>

                    <span>
                      اگر خطایی مشاهده می‌کنید، متن خطا و توضیح
                      اتفاق را داخل درخواست قرار دهید.
                    </span>
                  </div>
                </div>

                <div className="tip">
                  <div className="tip-icon">
                    <Icon name="shield" size={14} />
                  </div>

                  <div>
                    <strong>
                      اطلاعات محرمانه ارسال نکنید
                    </strong>

                    <span>
                      رمز عبور، توکن خصوصی یا اطلاعات حساس حساب
                      را برای پشتیبانی ارسال نکنید.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TICKETS */}

          <section className="panel glass tickets" id="tickets">
            <div className="tickets-head">
              <h3>درخواست‌های من</h3>

              <div className="ticket-count">
                <span className="count active">
                  همه {totalTickets.toLocaleString("fa-IR")}
                </span>

                <span className="count">
                  باز {openTickets.toLocaleString("fa-IR")}
                </span>

                <span className="count">
                  پاسخ داده شده{" "}
                  {answeredTickets.toLocaleString("fa-IR")}
                </span>

                <span className="count">
                  بسته{" "}
                  {closedTickets.toLocaleString("fa-IR")}
                </span>
              </div>
            </div>

            {tickets.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <Icon name="support" size={21} />
                </div>

                <strong>
                  هنوز درخواست پشتیبانی ندارید
                </strong>

                <span>
                  اولین درخواست خود را از فرم بالا ایجاد کنید.
                </span>
              </div>
            ) : (
              <div className="ticket-list">
                {tickets.map((ticket) => {
                  const hasSupportReply = ticket.messages.some(
                    (message) =>
                      message.senderType === "ADMIN" ||
                      message.senderType === "SUPPORT"
                  );

                  const displayStatus =
                    ticket.status === "CLOSED"
                      ? "CLOSED"
                      : hasSupportReply
                        ? "ANSWERED"
                        : ticket.status;

                  return (
                    <article
                      className="ticket"
                      key={ticket.id}
                    >
                      <div className="ticket-head">
                        <div className="ticket-main">
                          <strong>
                            {ticket.subject}
                          </strong>

                          <div className="ticket-meta">
                            <span>
                              شناسه: {ticket.id}
                            </span>

                            <span>
                              ایجاد:{" "}
                              {dateText(ticket.createdAt)}
                            </span>

                            <span>
                              بروزرسانی:{" "}
                              {dateText(ticket.updatedAt)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`badge ${statusClass(
                            displayStatus
                          )}`}
                        >
                          {statusLabel(displayStatus)}
                        </span>
                      </div>

                      <div className="messages">
                        {ticket.messages.length === 0 ? (
                          <div className="message-text">
                            هنوز پیامی در این درخواست وجود ندارد.
                          </div>
                        ) : (
                          ticket.messages.map((message) => {
                            const isSupport =
                              message.senderType === "ADMIN" ||
                              message.senderType === "SUPPORT";

                            return (
                              <div
                                className={`message ${
                                  isSupport ? "admin" : ""
                                }`}
                                key={message.id}
                              >
                                <div className="message-avatar">
                                  {isSupport ? (
                                    <Icon
                                      name="support"
                                      size={13}
                                    />
                                  ) : (
                                    initials
                                  )}
                                </div>

                                <div className="message-content">
                                  <div className="message-top">
                                    <strong>
                                      {isSupport
                                        ? "تیم پشتیبانی"
                                        : "شما"}
                                    </strong>

                                    <span>
                                      {dateText(
                                        message.createdAt
                                      )}
                                    </span>
                                  </div>

                                  <div className="message-text">
                                    {message.message}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {ticket.status === "CLOSED" ? (
                        <div className="closed-note">
                          این درخواست بسته شده است و امکان ارسال
                          پیام جدید وجود ندارد.
                        </div>
                      ) : (
                        <form
                          action={replyToTicket}
                          className="reply"
                        >
                          <input
                            type="hidden"
                            name="ticketId"
                            value={ticket.id}
                          />

                          <input
                            type="text"
                            name="message"
                            maxLength={5000}
                            required
                            placeholder="پاسخ یا توضیح جدید خود را بنویسید..."
                          />

                          <button
                            type="submit"
                            title="ارسال پیام"
                            aria-label="ارسال پیام"
                          >
                            <Icon name="send" size={15} />
                          </button>
                        </form>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="footer">
            Trading AI Support Center · سیستم پشتیبانی متصل به حساب کاربری
          </footer>
        </section>
      </div>
    </main>
  );
}
