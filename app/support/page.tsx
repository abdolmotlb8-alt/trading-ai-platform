import Link from "next/link";
import { redirect, revalidatePath } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusText(status: string) {
  switch (status) {
    case "OPEN":
      return "باز";
    case "PENDING":
      return "در انتظار پاسخ";
    case "ANSWERED":
      return "پاسخ داده شده";
    case "CLOSED":
      return "بسته شده";
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "CLOSED":
      return "closed";
    case "ANSWERED":
      return "answered";
    case "PENDING":
      return "pending";
    default:
      return "open";
  }
}

function Icon({
  name,
  size = 19,
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
    | "arrow"
    | "shield"
    | "close";
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
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
        <path d="M4 18V6" />
        <path d="M4 18h16" />
        <path d="m7 14 4-5 3 3 5-7" />
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
        <path d="m5.5 5.5 13 13" />
        <path d="m18.5 5.5-13 13" />
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

    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),

    shield: (
      <>
        <path d="M12 3 20 6v5c0 5-3.2 8.5-8 10-4.8-1.5-8-5-8-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
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
      {paths[name]}
    </svg>
  );
}

async function createTicket(formData: FormData) {
  "use server";

  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (subject.length < 3 || subject.length > 120) {
    redirect("/support?error=subject");
  }

  if (message.length < 5 || message.length > 5000) {
    redirect("/support?error=message");
  }

  await prisma.supportTicket.create({
    data: {
      userId: session.userId,
      subject,
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

  revalidatePath("/support");
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

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: session.userId,
        senderType: "USER",
        message,
      },
    }),
    prisma.supportTicket.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: "OPEN",
      },
    }),
  ]);

  revalidatePath("/support");
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
    take: 30,
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        take: 30,
      },
    },
  });

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) => ticket.status !== "CLOSED"
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
      .toUpperCase() || "AI";

  const errorMessages: Record<string, string> = {
    subject: "عنوان درخواست باید بین ۳ تا ۱۲۰ کاراکتر باشد.",
    message: "متن درخواست باید بین ۵ تا ۵۰۰۰ کاراکتر باشد.",
    reply: "متن پاسخ معتبر نیست.",
    ticket: "درخواست موردنظر پیدا نشد.",
    closed: "این درخواست قبلاً بسته شده است.",
  };

  const errorText = params.error
    ? errorMessages[params.error] ?? "عملیات انجام نشد."
    : "";

  return (
    <main dir="rtl" className="support-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #050505;
          color: #f7f2e8;
          font-family: Tahoma, Arial, sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        .support-page {
          min-height: 100vh;
          padding: 18px;
          background:
            radial-gradient(
              circle at 88% 0%,
              rgba(212, 175, 55, 0.12),
              transparent 27%
            ),
            radial-gradient(
              circle at 0% 100%,
              rgba(126, 94, 22, 0.10),
              transparent 30%
            ),
            #050505;
        }

        .app-shell {
          width: min(1480px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 18px;
          direction: ltr;
        }

        .sidebar,
        .main {
          direction: rtl;
        }

        .sidebar {
          position: sticky;
          top: 18px;
          height: calc(100vh - 36px);
          overflow-y: auto;
          padding: 18px;
          border: 1px solid rgba(212, 175, 55, 0.13);
          border-radius: 25px;
          background:
            linear-gradient(
              180deg,
              rgba(19, 19, 18, 0.96),
              rgba(9, 9, 9, 0.96)
            );
          box-shadow:
            0 25px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 4px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .brand-logo {
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #050505;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 1px;
          background:
            linear-gradient(
              145deg,
              #f7df86,
              #d4af37 45%,
              #8e6813
            );
          box-shadow:
            0 8px 30px rgba(212, 175, 55, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .brand strong {
          display: block;
          font-size: 16px;
          color: #fff;
        }

        .brand span {
          display: block;
          margin-top: 5px;
          color: #77736b;
          font-size: 9px;
          letter-spacing: 0.7px;
        }

        .nav-title {
          margin: 24px 7px 10px;
          color: #6f6a60;
          font-size: 9px;
          font-weight: 700;
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
          gap: 11px;
          padding: 0 12px;
          border: 1px solid transparent;
          border-radius: 13px;
          color: #8e8a82;
          font-size: 11px;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .nav a svg {
          color: #77736a;
          flex: 0 0 auto;
        }

        .nav a:hover {
          color: #f5e8c2;
          background: rgba(212, 175, 55, 0.055);
          border-color: rgba(212, 175, 55, 0.08);
          transform: translateX(-2px);
        }

        .nav a.active {
          color: #f5d76e;
          background:
            linear-gradient(
              90deg,
              rgba(212, 175, 55, 0.13),
              rgba(212, 175, 55, 0.035)
            );
          border-color: rgba(212, 175, 55, 0.18);
          box-shadow: inset -2px 0 #d4af37;
        }

        .nav a.active svg {
          color: #d4af37;
        }

        .sidebar-bottom {
          margin-top: 25px;
          padding-top: 17px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }

        .security-box {
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(212, 175, 55, 0.11);
          background: rgba(212, 175, 55, 0.035);
        }

        .security-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #d9b94d;
          font-size: 10px;
          font-weight: 700;
        }

        .security-box p {
          margin: 9px 0 0;
          color: #706c64;
          font-size: 9px;
          line-height: 2;
        }

        .main {
          min-width: 0;
        }

        .topbar {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 17px 20px;
          border: 1px solid rgba(212, 175, 55, 0.12);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(19, 19, 18, 0.95),
              rgba(10, 10, 10, 0.91)
            );
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
        }

        .eyebrow {
          margin-bottom: 7px;
          color: #b99124;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .topbar h1 {
          margin: 0;
          font-size: 22px;
          color: #fff;
        }

        .topbar p {
          margin: 6px 0 0;
          color: #77736b;
          font-size: 10px;
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
          border: 1px solid rgba(212, 175, 55, 0.11);
          border-radius: 30px;
          color: #9e988d;
          font-size: 9px;
          white-space: nowrap;
        }

        .online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #51c878;
          box-shadow: 0 0 10px #51c878;
        }

        .avatar {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #080706;
          font-size: 11px;
          font-weight: 900;
          background:
            linear-gradient(
              145deg,
              #f4db79,
              #c79d29
            );
          box-shadow: 0 7px 25px rgba(212, 175, 55, 0.14);
        }

        .hero {
          position: relative;
          overflow: hidden;
          margin-top: 18px;
          padding: 31px;
          border: 1px solid rgba(212, 175, 55, 0.14);
          border-radius: 26px;
          background:
            radial-gradient(
              circle at 86% 20%,
              rgba(212, 175, 55, 0.10),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              rgba(24, 24, 22, 0.97),
              rgba(9, 9, 9, 0.97)
            );
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .hero:after {
          content: "";
          position: absolute;
          width: 240px;
          height: 240px;
          left: -100px;
          bottom: -140px;
          border: 1px solid rgba(212, 175, 55, 0.10);
          border-radius: 50%;
          box-shadow:
            0 0 0 35px rgba(212, 175, 55, 0.025),
            0 0 0 70px rgba(212, 175, 55, 0.018);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 850px;
        }

        .status-pill {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(212, 175, 55, 0.17);
          background: rgba(212, 175, 55, 0.045);
          color: #d9b94d;
          font-size: 9px;
          font-weight: 700;
        }

        .status-pill span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d4af37;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.7);
        }

        .hero h2 {
          margin: 22px 0 10px;
          font-size: clamp(24px, 4vw, 38px);
          line-height: 1.35;
          color: #fff;
        }

        .hero h2 em {
          color: #d4af37;
          font-style: normal;
        }

        .hero p {
          max-width: 720px;
          margin: 0;
          color: #8c877d;
          font-size: 11px;
          line-height: 2.1;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 23px;
        }

        .hero-link {
          min-height: 41px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid rgba(212, 175, 55, 0.15);
          color: #b5afa4;
          background: rgba(255, 255, 255, 0.018);
          font-size: 10px;
        }

        .hero-link.primary {
          color: #080706;
          border-color: transparent;
          background:
            linear-gradient(
              135deg,
              #f2d66f,
              #c99d2e
            );
          font-weight: 800;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
        }

        .stat {
          min-height: 104px;
          padding: 17px;
          border: 1px solid rgba(212, 175, 55, 0.09);
          border-radius: 19px;
          background:
            linear-gradient(
              145deg,
              rgba(19, 19, 18, 0.92),
              rgba(10, 10, 10, 0.92)
            );
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.2);
        }

        .stat-icon {
          width: 33px;
          height: 33px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          border-radius: 10px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.075);
        }

        .stat small {
          display: block;
          color: #77736b;
          font-size: 9px;
        }

        .stat strong {
          display: block;
          margin-top: 5px;
          color: #f7f2e8;
          font-size: 20px;
        }

        .content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          gap: 13px;
          margin-top: 13px;
          align-items: start;
        }

        .panel {
          min-width: 0;
          padding: 20px;
          border: 1px solid rgba(212, 175, 55, 0.10);
          border-radius: 21px;
          background:
            linear-gradient(
              145deg,
              rgba(18, 18, 17, 0.94),
              rgba(8, 8, 8, 0.94)
            );
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.24);
        }

        .panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 18px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .panel-title-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.065);
        }

        .panel h3 {
          margin: 0;
          color: #f4f0e8;
          font-size: 13px;
        }

        .panel-head p {
          margin: 3px 0 0;
          color: #66625b;
          font-size: 8px;
        }

        .ticket-form {
          display: grid;
          gap: 11px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field label {
          color: #aaa49a;
          font-size: 9px;
        }

        .field input,
        .field textarea {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.075);
          outline: none;
          border-radius: 12px;
          color: #eee8dd;
          background: #080808;
          padding: 12px 13px;
          font-size: 10px;
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }

        .field textarea {
          min-height: 145px;
          resize: vertical;
          line-height: 2;
        }

        .field input::placeholder,
        .field textarea::placeholder {
          color: #4e4b46;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: rgba(212, 175, 55, 0.45);
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.055);
        }

        .submit-btn {
          min-height: 45px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 12px;
          color: #080706;
          background:
            linear-gradient(
              135deg,
              #f0d36a,
              #c69a2c
            );
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
          box-shadow: 0 10px 28px rgba(212, 175, 55, 0.10);
        }

        .notice {
          margin-bottom: 13px;
          padding: 11px 13px;
          border-radius: 12px;
          font-size: 9px;
          line-height: 1.9;
        }

        .notice.success {
          border: 1px solid rgba(76, 175, 80, 0.17);
          color: #a7d9ac;
          background: rgba(76, 175, 80, 0.05);
        }

        .notice.error {
          border: 1px solid rgba(220, 100, 100, 0.18);
          color: #e7aaaa;
          background: rgba(220, 100, 100, 0.045);
        }

        .tips {
          display: grid;
          gap: 9px;
        }

        .tip {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.018);
        }

        .tip-icon {
          width: 29px;
          height: 29px;
          flex: 0 0 29px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.07);
        }

        .tip strong {
          display: block;
          color: #d9d3c8;
          font-size: 9px;
        }

        .tip span {
          display: block;
          margin-top: 4px;
          color: #66625b;
          font-size: 8px;
          line-height: 1.9;
        }

        .tickets {
          margin-top: 13px;
        }

        .tickets-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .tickets-header h3 {
          margin: 0;
          color: #f4f0e8;
          font-size: 13px;
        }

        .tickets-header span {
          padding: 5px 8px;
          border-radius: 7px;
          color: #b9952f;
          background: rgba(212, 175, 55, 0.06);
          font-size: 8px;
        }

        .ticket-list {
          display: grid;
          gap: 10px;
        }

        .ticket {
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.015);
          overflow: hidden;
        }

        .ticket-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.045);
        }

        .ticket-title {
          min-width: 0;
        }

        .ticket-title strong {
          display: block;
          overflow: hidden;
          color: #eee9df;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ticket-title span {
          display: block;
          margin-top: 5px;
          color: #5f5b55;
          font-size: 8px;
        }

        .badge {
          flex: 0 0 auto;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 8px;
          border: 1px solid rgba(212, 175, 55, 0.11);
          color: #c6a43b;
          background: rgba(212, 175, 55, 0.045);
        }

        .badge.answered {
          color: #a6d6ae;
          border-color: rgba(86, 174, 101, 0.15);
          background: rgba(86, 174, 101, 0.045);
        }

        .badge.pending {
          color: #d7bd75;
        }

        .badge.closed {
          color: #77736c;
          border-color: rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.025);
        }

        .messages {
          padding: 13px;
          display: grid;
          gap: 8px;
        }

        .message {
          max-width: 86%;
          padding: 10px 12px;
          border-radius: 12px;
          color: #9a958c;
          background: #090909;
          border: 1px solid rgba(255, 255, 255, 0.045);
        }

        .message.user {
          margin-right: auto;
          border-color: rgba(212, 175, 55, 0.08);
        }

        .message.admin {
          margin-left: auto;
          color: #c7d5ca;
          border-color: rgba(79, 155, 91, 0.12);
          background: rgba(79, 155, 91, 0.035);
        }

        .message-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 5px;
          color: #69655e;
          font-size: 7px;
        }

        .message.admin .message-head strong {
          color: #92bd9a;
        }

        .message-body {
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 9px;
          line-height: 1.95;
        }

        .reply-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          padding: 0 13px 13px;
        }

        .reply-form input {
          min-width: 0;
          width: 100%;
          height: 39px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 11px;
          outline: none;
          padding: 0 12px;
          color: #eee8dd;
          background: #080808;
          font-size: 9px;
        }

        .reply-form input:focus {
          border-color: rgba(212, 175, 55, 0.4);
        }

        .reply-btn {
          width: 43px;
          height: 39px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(212, 175, 55, 0.18);
          border-radius: 11px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.06);
          cursor: pointer;
        }

        .closed-note {
          margin: 0 13px 13px;
          padding: 10px 12px;
          border-radius: 11px;
          color: #5f5b54;
          background: rgba(255, 255, 255, 0.02);
          font-size: 8px;
          text-align: center;
        }

        .empty {
          padding: 35px 20px;
          text-align: center;
          border: 1px dashed rgba(212, 175, 55, 0.12);
          border-radius: 16px;
          color: #68645d;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin: 0 auto 10px;
          border-radius: 15px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.06);
        }

        .empty strong {
          display: block;
          color: #a8a299;
          font-size: 10px;
        }

        .empty span {
          display: block;
          margin-top: 5px;
          font-size: 8px;
        }

        .footer {
          margin-top: 14px;
          padding: 15px;
          text-align: center;
          color: #4f4b45;
          font-size: 8px;
        }

        @media (max-width: 1050px) {
          .app-shell {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .support-page {
            padding: 9px;
          }

          .topbar {
            padding: 15px;
          }

          .top-user .online {
            display: none;
          }

          .topbar h1 {
            font-size: 19px;
          }

          .hero {
            padding: 22px;
            border-radius: 21px;
          }

          .hero h2 {
            font-size: 25px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .stat {
            min-height: 85px;
          }

          .content-grid {
            margin-top: 10px;
          }

          .panel {
            padding: 15px;
            border-radius: 18px;
          }

          .ticket-top {
            align-items: flex-start;
          }

          .message {
            max-width: 94%;
          }
        }

        @media (max-width: 470px) {
          .topbar {
            align-items: flex-start;
          }

          .avatar {
            width: 35px;
            height: 35px;
          }

          .hero h2 {
            font-size: 23px;
          }

          .hero-actions {
            display: grid;
          }

          .hero-link {
            width: 100%;
          }

          .reply-form {
            grid-template-columns: 1fr 43px;
          }
        }
      `}</style>

      <div className="app-shell">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <Link href="/dashboard" className="brand">
            <div className="brand-logo">AI</div>

            <div>
              <strong>Trading AI</strong>
              <span>SMART TRADING PLATFORM</span>
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
              پرداخت‌ها
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

          <div className="sidebar-bottom">
            <div className="security-box">
              <div className="security-title">
                <Icon name="shield" size={15} />
                پشتیبانی امن
              </div>

              <p>
                درخواست‌های شما مستقیماً در حساب کاربری ثبت می‌شوند و پاسخ
                پشتیبانی داخل همین بخش نمایش داده خواهد شد.
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <section className="main">
          <header className="topbar">
            <div>
              <div className="eyebrow">TRADING AI SUPPORT CENTER</div>

              <h1>مرکز پشتیبانی</h1>

              <p>
                مدیریت درخواست‌ها و ارتباط مستقیم با تیم پشتیبانی
              </p>
            </div>

            <div className="top-user">
              <div className="online">
                <span className="online-dot" />
                سیستم فعال است
              </div>

              <div className="avatar">{initials}</div>
            </div>
          </header>

          {/* HERO */}
          <section className="hero">
            <div className="hero-content">
              <div className="status-pill">
                <span />
                پشتیبانی آنلاین Trading AI
              </div>

              <h2>
                همیشه یک قدم
                <em> با شما</em>
              </h2>

              <p>
                مشکل یا سوالی درباره حساب، ربات‌ها، سیگنال‌ها، پرداخت،
                اتصال بروکر یا سرویس‌های Trading AI دارید؟ درخواست خود را
                ثبت کنید و پاسخ تیم پشتیبانی را در همین صفحه دریافت کنید.
              </p>

              <div className="hero-actions">
                <a href="#new-ticket" className="hero-link primary">
                  <Icon name="plus" size={15} />
                  ایجاد درخواست جدید
                </a>

                <a href="#my-tickets" className="hero-link">
                  <Icon name="message" size={15} />
                  درخواست‌های من
                </a>
              </div>
            </div>
          </section>

          {/* STATS */}
          <section className="stats">
            <div className="stat">
              <div className="stat-icon">
                <Icon name="message" size={17} />
              </div>

              <small>کل درخواست‌ها</small>
              <strong>{totalTickets.toLocaleString("fa-IR")}</strong>
            </div>

            <div className="stat">
              <div className="stat-icon">
                <Icon name="clock" size={17} />
              </div>

              <small>درخواست‌های باز</small>
              <strong>{openTickets.toLocaleString("fa-IR")}</strong>
            </div>

            <div className="stat">
              <div className="stat-icon">
                <Icon name="check" size={17} />
              </div>

              <small>دارای پاسخ پشتیبانی</small>
              <strong>{answeredTickets.toLocaleString("fa-IR")}</strong>
            </div>
          </section>

          {/* NOTICES */}
          {(params.created || params.replied || errorText) && (
            <div style={{ marginTop: 13 }}>
              {params.created && (
                <div className="notice success">
                  درخواست شما با موفقیت ثبت شد و در مرکز پشتیبانی ذخیره شد.
                </div>
              )}

              {params.replied && (
                <div className="notice success">
                  پیام شما با موفقیت به درخواست پشتیبانی اضافه شد.
                </div>
              )}

              {errorText && (
                <div className="notice error">{errorText}</div>
              )}
            </div>
          )}

          {/* CREATE + TIPS */}
          <section className="content-grid" id="new-ticket">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">
                  <div className="panel-title-icon">
                    <Icon name="plus" size={17} />
                  </div>

                  <div>
                    <h3>ایجاد درخواست جدید</h3>
                    <p>موضوع و توضیح مشکل خود را وارد کنید</p>
                  </div>
                </div>
              </div>

              <form action={createTicket} className="ticket-form">
                <div className="field">
                  <label htmlFor="subject">موضوع درخواست</label>

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
                  <label htmlFor="message">توضیحات</label>

                  <textarea
                    id="message"
                    name="message"
                    maxLength={5000}
                    required
                    placeholder="مشکل یا سوال خود را با جزئیات بنویسید..."
                  />
                </div>

                <button type="submit" className="submit-btn">
                  <Icon name="send" size={16} />
                  ثبت درخواست پشتیبانی
                </button>
              </form>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">
                  <div className="panel-title-icon">
                    <Icon name="shield" size={17} />
                  </div>

                  <div>
                    <h3>قبل از ارسال درخواست</h3>
                    <p>برای پاسخ دقیق‌تر</p>
                  </div>
                </div>
              </div>

              <div className="tips">
                <div className="tip">
                  <div className="tip-icon">
                    <Icon name="message" size={14} />
                  </div>

                  <div>
                    <strong>موضوع را واضح بنویسید</strong>
                    <span>
                      موضوع کوتاه و مشخص باعث می‌شود درخواست سریع‌تر
                      بررسی شود.
                    </span>
                  </div>
                </div>

                <div className="tip">
                  <div className="tip-icon">
                    <Icon name="clock" size={14} />
                  </div>

                  <div>
                    <strong>درخواست را دوباره ایجاد نکنید</strong>
                    <span>
                      اگر قبلاً تیکت ساخته‌اید، از همان درخواست برای ادامه
                      گفتگو استفاده کنید.
                    </span>
                  </div>
                </div>

                <div className="tip">
                  <div className="tip-icon">
                    <Icon name="shield" size={14} />
                  </div>

                  <div>
                    <strong>اطلاعات حساس ارسال نکنید</strong>
                    <span>
                      رمز عبور، کد امنیتی یا اطلاعات محرمانه حساب را داخل
                      پیام پشتیبانی قرار ندهید.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TICKETS */}
          <section className="panel tickets" id="my-tickets">
            <div className="tickets-header">
              <div>
                <h3>درخواست‌های من</h3>
              </div>

              <span>
                {totalTickets.toLocaleString("fa-IR")} درخواست
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <Icon name="support" size={21} />
                </div>

                <strong>هنوز درخواست پشتیبانی ثبت نکرده‌اید</strong>

                <span>
                  اگر مشکلی دارید، اولین درخواست خود را از بخش بالا ایجاد
                  کنید.
                </span>
              </div>
            ) : (
              <div className="ticket-list">
                {tickets.map((ticket) => {
                  const hasAdminReply = ticket.messages.some(
                    (message) =>
                      message.senderType === "ADMIN" ||
                      message.senderType === "SUPPORT"
                  );

                  const visualStatus =
                    ticket.status === "CLOSED"
                      ? "CLOSED"
                      : hasAdminReply
                        ? "ANSWERED"
                        : ticket.status;

                  return (
                    <article className="ticket" key={ticket.id}>
                      <div className="ticket-top">
                        <div className="ticket-title">
                          <strong>{ticket.subject}</strong>

                          <span>
                            آخرین بروزرسانی:{" "}
                            {formatDate(ticket.updatedAt)}
                          </span>
                        </div>

                        <span
                          className={`badge ${statusClass(
                            visualStatus
                          )}`}
                        >
                          {statusText(visualStatus)}
                        </span>
                      </div>

                      <div className="messages">
                        {ticket.messages.map((message) => {
                          const isAdmin =
                            message.senderType === "ADMIN" ||
                            message.senderType === "SUPPORT";

                          return (
                            <div
                              className={`message ${
                                isAdmin ? "admin" : "user"
                              }`}
                              key={message.id}
                            >
                              <div className="message-head">
                                <strong>
                                  {isAdmin
                                    ? "تیم پشتیبانی"
                                    : "شما"}
                                </strong>

                                <span>
                                  {formatDate(message.createdAt)}
                                </span>
                              </div>

                              <div className="message-body">
                                {message.message}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {ticket.status === "CLOSED" ? (
                        <div className="closed-note">
                          این درخواست بسته شده است.
                        </div>
                      ) : (
                        <form
                          action={replyToTicket}
                          className="reply-form"
                        >
                          <input
                            type="hidden"
                            name="ticketId"
                            value={ticket.id}
                          />

                          <input
                            name="message"
                            type="text"
                            maxLength={5000}
                            required
                            placeholder="پاسخ یا توضیح جدید..."
                          />

                          <button
                            type="submit"
                            className="reply-btn"
                            aria-label="ارسال پاسخ"
                            title="ارسال پاسخ"
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
            Trading AI Support Center · درخواست‌ها مستقیماً با حساب کاربری
            شما ثبت و مدیریت می‌شوند.
          </footer>
        </section>
      </div>
    </main>
  );
}
