import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS = {
  OPEN: "باز",
  PENDING: "در انتظار پاسخ",
  CLOSED: "بسته",
} as const;

const PLAN = {
  FREE: "رایگان",
  BASIC: "پایه",
  PRO: "حرفه‌ای",
  PREMIUM: "پریمیوم",
  VIP: "VIP",
} as const;

function dateText(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: string) {
  return STATUS[status as keyof typeof STATUS] ?? status;
}

function planLabel(plan: string) {
  return PLAN[plan as keyof typeof PLAN] ?? plan;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((x) => x.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

async function requireAdmin() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const admin = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/");
  }

  return admin;
}

/* =========================================================
   پاسخ به تیکت
========================================================= */

async function replyToTicket(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!ticketId || !message) {
    return;
  }

  if (message.length > 5000) {
    return;
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: {
      id: ticketId,
    },
    select: {
      id: true,
      userId: true,
      subject: true,
      status: true,
    },
  });

  if (!ticket) {
    return;
  }

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: admin.id,
        senderType: "ADMIN",
        message,
      },
    }),

    prisma.supportTicket.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: "PENDING",
        updatedAt: new Date(),
      },
    }),

    prisma.userNotification.create({
      data: {
        userId: ticket.userId,
        type: "SUPPORT_REPLY",
        title: "پاسخ جدید از پشتیبانی",
        message: `پاسخ جدیدی برای تیکت «${ticket.subject}» ارسال شده است.`,
        dedupeKey: `support-reply-${ticket.id}-${randomUUID()}`,
      },
    }),
  ]);

  revalidatePath("/admin/support");
  revalidatePath("/support");
}

/* =========================================================
   تغییر وضعیت
========================================================= */

async function changeTicketStatus(formData: FormData) {
  "use server";

  await requireAdmin();

  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  const allowed = ["OPEN", "PENDING", "CLOSED"];

  if (!ticketId || !allowed.includes(status)) {
    return;
  }

  await prisma.supportTicket.update({
    where: {
      id: ticketId,
    },
    data: {
      status,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/support");
  revalidatePath("/support");
}

/* =========================================================
   صفحه
========================================================= */

export default async function AdminSupportPage() {
  const admin = await requireAdmin();

  const [
    totalTickets,
    openTickets,
    pendingTickets,
    closedTickets,
    tickets,
  ] = await Promise.all([
    prisma.supportTicket.count(),

    prisma.supportTicket.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.supportTicket.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.supportTicket.count({
      where: {
        status: "CLOSED",
      },
    }),

    prisma.supportTicket.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
            role: true,
            isBlocked: true,
          },
        },

        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),
  ]);

  return (
    <main dir="rtl" className="admin-support-page">
      <style>{`
        *{
          box-sizing:border-box;
        }

        html{
          background:#05070b;
        }

        body{
          margin:0;
          background:#05070b;
          color:#f7f7f7;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        button,
        input,
        textarea,
        select{
          font:inherit;
        }

        button{
          cursor:pointer;
        }

        a{
          color:inherit;
          text-decoration:none;
        }

        .admin-support-page{
          min-height:100vh;
          padding:22px;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(212,166,70,.13),
              transparent 28%
            ),
            radial-gradient(
              circle at 0% 90%,
              rgba(20,91,118,.16),
              transparent 30%
            ),
            #05070b;
        }

        .shell{
          width:min(1450px,100%);
          margin:auto;
        }

        /* HEADER */

        .topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          margin-bottom:20px;
          padding:18px 20px;
          border:1px solid rgba(255,255,255,.09);
          border-radius:22px;
          background:
            linear-gradient(
              135deg,
              rgba(21,25,32,.92),
              rgba(10,13,18,.88)
            );
          box-shadow:
            0 20px 70px rgba(0,0,0,.35);
          backdrop-filter:blur(20px);
        }

        .brand{
          display:flex;
          align-items:center;
          gap:13px;
        }

        .brand-logo{
          width:50px;
          height:50px;
          display:grid;
          place-items:center;
          border-radius:16px;
          border:1px solid rgba(237,190,78,.24);
          background:
            linear-gradient(
              145deg,
              rgba(238,194,91,.18),
              rgba(238,194,91,.04)
            );
          color:#f0c968;
          font-size:20px;
          font-weight:900;
          box-shadow:
            0 0 30px rgba(224,174,63,.08);
        }

        .brand strong{
          display:block;
          font-size:17px;
        }

        .brand span{
          display:block;
          margin-top:5px;
          color:#718095;
          font-size:10px;
        }

        .admin-box{
          display:flex;
          align-items:center;
          gap:10px;
          padding:9px 12px;
          border:1px solid rgba(255,255,255,.07);
          border-radius:15px;
          background:#ffffff04;
        }

        .admin-avatar{
          width:38px;
          height:38px;
          display:grid;
          place-items:center;
          border-radius:12px;
          background:#d9ad4d14;
          border:1px solid #d9ad4d25;
          color:#e5bf62;
          font-weight:900;
        }

        .admin-box strong{
          display:block;
          font-size:11px;
        }

        .admin-box span{
          display:block;
          color:#6f7c8e;
          margin-top:4px;
          font-size:9px;
        }

        /* BREADCRUMB */

        .breadcrumb{
          display:flex;
          align-items:center;
          gap:9px;
          margin:4px 4px 18px;
          color:#738196;
          font-size:11px;
        }

        .breadcrumb a{
          color:#d3a948;
        }

        /* HERO */

        .hero{
          position:relative;
          overflow:hidden;
          padding:28px;
          margin-bottom:18px;
          border:1px solid rgba(255,255,255,.08);
          border-radius:26px;
          background:
            linear-gradient(
              135deg,
              rgba(25,27,31,.96),
              rgba(10,13,18,.94)
            );
        }

        .hero:after{
          content:"";
          position:absolute;
          width:250px;
          height:250px;
          border-radius:50%;
          left:-120px;
          bottom:-150px;
          background:#d6aa4b0b;
          filter:blur(10px);
        }

        .eyebrow{
          color:#dcb75c;
          font-size:10px;
          font-weight:900;
          letter-spacing:3px;
        }

        .hero h1{
          margin:9px 0 7px;
          font-size:clamp(25px,4vw,38px);
          line-height:1.5;
        }

        .hero p{
          margin:0;
          max-width:800px;
          color:#8591a2;
          line-height:2;
          font-size:12px;
        }

        /* STATS */

        .stats{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:12px;
          margin-bottom:18px;
        }

        .stat{
          min-height:112px;
          padding:18px;
          border:1px solid rgba(255,255,255,.07);
          border-radius:20px;
          background:
            linear-gradient(
              145deg,
              rgba(19,23,30,.9),
              rgba(9,12,17,.9)
            );
        }

        .stat-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          color:#788496;
          font-size:10px;
        }

        .stat-icon{
          width:36px;
          height:36px;
          display:grid;
          place-items:center;
          border-radius:12px;
          background:#ffffff06;
          border:1px solid #ffffff08;
          font-size:16px;
        }

        .stat-value{
          margin-top:13px;
          font-size:27px;
          font-weight:900;
        }

        .gold{
          color:#e6bd5b;
        }

        .green{
          color:#43df98;
        }

        .orange{
          color:#f2a24a;
        }

        .red{
          color:#ff6974;
        }

        /* CONTENT */

        .content{
          display:grid;
          grid-template-columns:390px minmax(0,1fr);
          gap:16px;
          align-items:start;
        }

        .panel{
          min-width:0;
          border:1px solid rgba(255,255,255,.08);
          border-radius:23px;
          overflow:hidden;
          background:
            linear-gradient(
              145deg,
              rgba(15,19,25,.95),
              rgba(7,10,14,.96)
            );
          box-shadow:0 20px 70px rgba(0,0,0,.22);
        }

        .panel-head{
          padding:18px;
          border-bottom:1px solid rgba(255,255,255,.06);
        }

        .panel-head h2{
          margin:0;
          font-size:16px;
        }

        .panel-head p{
          margin:7px 0 0;
          color:#697688;
          font-size:10px;
          line-height:1.8;
        }

        /* TICKETS */

        .tickets{
          max-height:850px;
          overflow:auto;
        }

        .ticket{
          display:block;
          width:100%;
          padding:17px;
          border:0;
          border-bottom:1px solid rgba(255,255,255,.055);
          background:transparent;
          color:white;
          text-align:right;
        }

        .ticket:hover{
          background:#ffffff03;
        }

        .ticket:last-child{
          border-bottom:0;
        }

        .ticket-user{
          display:flex;
          align-items:center;
          gap:10px;
        }

        .ticket-avatar{
          width:40px;
          height:40px;
          flex:0 0 auto;
          display:grid;
          place-items:center;
          border-radius:13px;
          background:
            linear-gradient(
              145deg,
              #d7ad4c18,
              #ffffff04
            );
          border:1px solid #d7ad4c22;
          color:#dfb957;
          font-weight:900;
        }

        .ticket-user strong{
          display:block;
          font-size:12px;
        }

        .ticket-user span{
          display:block;
          margin-top:4px;
          color:#687587;
          font-size:9px;
          direction:ltr;
          text-align:right;
        }

        .ticket-subject{
          margin-top:13px;
          font-size:11px;
          font-weight:700;
          line-height:1.8;
        }

        .ticket-meta{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          margin-top:12px;
        }

        .badge{
          display:inline-flex;
          align-items:center;
          gap:5px;
          padding:6px 9px;
          border-radius:999px;
          font-size:9px;
          background:#ffffff06;
          border:1px solid #ffffff08;
        }

        .badge-open{
          color:#45dd98;
          background:#43df9810;
          border-color:#43df9820;
        }

        .badge-pending{
          color:#e8c25f;
          background:#e8c25f10;
          border-color:#e8c25f20;
        }

        .badge-closed{
          color:#8490a0;
          background:#ffffff05;
        }

        .ticket-date{
          color:#5d6878;
          font-size:8px;
        }

        .empty{
          padding:60px 20px;
          text-align:center;
          color:#667386;
          font-size:11px;
          line-height:2;
        }

        /* CONVERSATION */

        .conversation{
          min-height:650px;
        }

        .conversation-head{
          padding:20px;
          border-bottom:1px solid rgba(255,255,255,.06);
        }

        .conversation-user{
          display:flex;
          align-items:center;
          gap:12px;
        }

        .conversation-avatar{
          width:48px;
          height:48px;
          display:grid;
          place-items:center;
          border-radius:15px;
          color:#e7bd5b;
          font-weight:900;
          background:#e7bd5b12;
          border:1px solid #e7bd5b22;
        }

        .conversation-user strong{
          display:block;
          font-size:14px;
        }

        .conversation-user span{
          display:block;
          margin-top:5px;
          color:#687689;
          font-size:9px;
        }

        .conversation-title{
          margin-top:17px;
          font-size:16px;
          font-weight:900;
          line-height:1.8;
        }

        .conversation-info{
          display:flex;
          flex-wrap:wrap;
          gap:7px;
          margin-top:11px;
        }

        /* MESSAGES */

        .messages{
          max-height:560px;
          overflow:auto;
          padding:20px;
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        .message{
          max-width:82%;
        }

        .message.admin{
          align-self:flex-start;
        }

        .message.user{
          align-self:flex-end;
        }

        .message-label{
          margin-bottom:5px;
          color:#647184;
          font-size:8px;
        }

        .message-bubble{
          padding:13px 15px;
          border-radius:17px;
          line-height:2;
          font-size:11px;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
        }

        .message.user .message-bubble{
          border:1px solid rgba(255,255,255,.07);
          background:#ffffff06;
          border-top-right-radius:5px;
        }

        .message.admin .message-bubble{
          border:1px solid rgba(222,182,87,.16);
          background:
            linear-gradient(
              135deg,
              rgba(219,178,80,.11),
              rgba(255,255,255,.025)
            );
          border-top-left-radius:5px;
        }

        .message-time{
          margin-top:5px;
          color:#515d6d;
          font-size:8px;
        }

        /* REPLY */

        .reply{
          padding:17px;
          border-top:1px solid rgba(255,255,255,.06);
          background:#ffffff02;
        }

        .reply textarea{
          width:100%;
          min-height:120px;
          resize:vertical;
          padding:13px;
          outline:none;
          color:#f5f7fa;
          border:1px solid rgba(255,255,255,.08);
          border-radius:15px;
          background:#05080d;
          line-height:2;
          font-size:11px;
        }

        .reply textarea:focus{
          border-color:#d9ae4d55;
          box-shadow:0 0 0 3px #d9ae4d09;
        }

        .reply-actions{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:9px;
        }

        .btn{
          min-height:39px;
          padding:0 14px;
          border-radius:12px;
          border:1px solid rgba(255,255,255,.08);
          background:#ffffff05;
          color:#cdd5df;
          font-size:10px;
          font-weight:700;
        }

        .btn:hover{
          background:#ffffff0a;
        }

        .btn-primary{
          border-color:#d7ac4a33;
          background:
            linear-gradient(
              135deg,
              #e5bd61,
              #b98425
            );
          color:#14100a;
          box-shadow:0 10px 25px #c797351c;
        }

        .btn-green{
          color:#5ae4a0;
          border-color:#43df9820;
        }

        .btn-red{
          color:#ff7b84;
          border-color:#ff667120;
        }

        .btn-gold{
          color:#e7bf61;
          border-color:#e7bf6120;
        }

        /* QUICK LINKS */

        .quick{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:8px;
          padding:12px;
          border-top:1px solid rgba(255,255,255,.05);
        }

        .quick a{
          min-height:42px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:11px;
          border:1px solid rgba(255,255,255,.07);
          background:#ffffff04;
          color:#8793a3;
          font-size:9px;
        }

        .quick a:hover{
          color:#e5bd5b;
          border-color:#e5bd5b20;
        }

        /* MOBILE */

        @media(max-width:1100px){
          .content{
            grid-template-columns:1fr;
          }

          .tickets{
            max-height:none;
          }

          .conversation{
            min-height:auto;
          }

          .messages{
            max-height:500px;
          }
        }

        @media(max-width:800px){
          .admin-support-page{
            padding:10px;
          }

          .topbar{
            padding:14px;
            border-radius:18px;
          }

          .admin-box{
            display:none;
          }

          .hero{
            padding:20px;
            border-radius:20px;
          }

          .stats{
            grid-template-columns:repeat(2,1fr);
            gap:8px;
          }

          .stat{
            min-height:95px;
            padding:14px;
          }

          .stat-value{
            font-size:23px;
          }

          .content{
            gap:10px;
          }

          .panel{
            border-radius:19px;
          }

          .message{
            max-width:94%;
          }

          .reply-actions{
            flex-direction:column;
          }

          .reply-actions .btn{
            width:100%;
          }

          .quick{
            grid-template-columns:1fr;
          }
        }

        @media(max-width:480px){
          .brand-logo{
            width:43px;
            height:43px;
          }

          .brand strong{
            font-size:14px;
          }

          .hero h1{
            font-size:24px;
          }

          .stats{
            grid-template-columns:1fr 1fr;
          }

          .stat-top{
            font-size:8px;
          }

          .stat-icon{
            width:30px;
            height:30px;
          }

          .stat-value{
            font-size:21px;
          }
        }
      `}</style>

      <div className="shell">

        {/* HEADER */}

        <header className="topbar">
          <Link href="/admin" className="brand">
            <div className="brand-logo">AI</div>

            <div>
              <strong>Trading AI</strong>
              <span>ADMIN CONTROL CENTER</span>
            </div>
          </Link>

          <div className="admin-box">
            <div className="admin-avatar">
              {initials(admin.name)}
            </div>

            <div>
              <strong>{admin.name}</strong>
              <span>مدیر سیستم</span>
            </div>
          </div>
        </header>

        <div className="breadcrumb">
          <Link href="/admin">مرکز مدیریت</Link>
          <span>‹</span>
          <span>مرکز پشتیبانی</span>
        </div>

        {/* HERO */}

        <section className="hero">
          <div className="eyebrow">
            SUPPORT CENTER
          </div>

          <h1>
            مرکز پشتیبانی کاربران
          </h1>

          <p>
            تمام درخواست‌های واقعی کاربران از دیتابیس خوانده می‌شوند.
            از همین بخش می‌توانید گفتگو کنید، پاسخ بدهید و وضعیت هر تیکت را
            مدیریت کنید.
          </p>
        </section>

        {/* STATS */}

        <section className="stats">

          <div className="stat">
            <div className="stat-top">
              <span>کل تیکت‌ها</span>
              <div className="stat-icon">◈</div>
            </div>

            <div className="stat-value">
              {totalTickets}
            </div>
          </div>

          <div className="stat">
            <div className="stat-top">
              <span>تیکت‌های باز</span>
              <div className="stat-icon">●</div>
            </div>

            <div className="stat-value green">
              {openTickets}
            </div>
          </div>

          <div className="stat">
            <div className="stat-top">
              <span>در انتظار پاسخ</span>
              <div className="stat-icon">◷</div>
            </div>

            <div className="stat-value gold">
              {pendingTickets}
            </div>
          </div>

          <div className="stat">
            <div className="stat-top">
              <span>بسته شده</span>
              <div className="stat-icon">✓</div>
            </div>

            <div className="stat-value">
              {closedTickets}
            </div>
          </div>

        </section>

        {/* MAIN */}

        <section className="content">

          {/* TICKET LIST */}

          <section className="panel">

            <div className="panel-head">
              <h2>
                درخواست‌های کاربران
              </h2>

              <p>
                آخرین تیکت‌ها بر اساس آخرین فعالیت
              </p>
            </div>

            <div className="tickets">

              {tickets.length === 0 ? (
                <div className="empty">
                  هنوز هیچ تیکتی ثبت نشده است.
                </div>
              ) : (
                tickets.map((ticket) => (
                  <details
                    key={ticket.id}
                    className="ticket"
                    open={ticket.id === tickets[0]?.id}
                  >
                    <summary
                      style={{
                        listStyle: "none",
                        cursor: "pointer",
                      }}
                    >
                      <div className="ticket-user">

                        <div className="ticket-avatar">
                          {initials(ticket.user.name)}
                        </div>

                        <div>
                          <strong>
                            {ticket.user.name}
                          </strong>

                          <span>
                            {ticket.user.email}
                          </span>
                        </div>

                      </div>

                      <div className="ticket-subject">
                        {ticket.subject}
                      </div>

                      <div className="ticket-meta">

                        <span
                          className={`badge ${
                            ticket.status === "OPEN"
                              ? "badge-open"
                              : ticket.status === "PENDING"
                                ? "badge-pending"
                                : "badge-closed"
                          }`}
                        >
                          {statusLabel(ticket.status)}
                        </span>

                        <span className="ticket-date">
                          {dateText(ticket.updatedAt)}
                        </span>

                      </div>
                    </summary>

                    <div
                      style={{
                        marginTop: "15px",
                        paddingTop: "14px",
                        borderTop: "1px solid rgba(255,255,255,.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "7px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span className="badge">
                          پلن: {planLabel(ticket.user.plan)}
                        </span>

                        {ticket.user.isBlocked && (
                          <span
                            className="badge"
                            style={{
                              color: "#ff7079",
                              borderColor: "#ff707922",
                            }}
                          >
                            حساب مسدود
                          </span>
                        )}

                        <span className="badge">
                          {ticket.messages.length} پیام
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: "12px",
                          display: "grid",
                          gap: "6px",
                        }}
                      >
                        {ticket.messages.map((message) => (
                          <div
                            key={message.id}
                            style={{
                              padding: "9px",
                              borderRadius: "10px",
                              background:
                                message.senderType === "ADMIN"
                                  ? "#d9ad4d0b"
                                  : "#ffffff04",
                              border:
                                "1px solid rgba(255,255,255,.05)",
                            }}
                          >
                            <div
                              style={{
                                color:
                                  message.senderType === "ADMIN"
                                    ? "#ddb85c"
                                    : "#8794a5",
                                fontSize: "8px",
                                marginBottom: "5px",
                              }}
                            >
                              {message.senderType === "ADMIN"
                                ? "پشتیبانی"
                                : "کاربر"}
                            </div>

                            <div
                              style={{
                                color: "#cbd3dd",
                                fontSize: "9px",
                                lineHeight: 1.9,
                              }}
                            >
                              {message.message}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                          marginTop: "12px",
                        }}
                      >
                        <form action={changeTicketStatus}>
                          <input
                            type="hidden"
                            name="ticketId"
                            value={ticket.id}
                          />

                          <input
                            type="hidden"
                            name="status"
                            value="OPEN"
                          />

                          <button
                            className="btn btn-green"
                            type="submit"
                          >
                            باز کردن
                          </button>
                        </form>

                        <form action={changeTicketStatus}>
                          <input
                            type="hidden"
                            name="ticketId"
                            value={ticket.id}
                          />

                          <input
                            type="hidden"
                            name="status"
                            value="PENDING"
                          />

                          <button
                            className="btn btn-gold"
                            type="submit"
                          >
                            در انتظار
                          </button>
                        </form>

                        <form action={changeTicketStatus}>
                          <input
                            type="hidden"
                            name="ticketId"
                            value={ticket.id}
                          />

                          <input
                            type="hidden"
                            name="status"
                            value="CLOSED"
                          />

                          <button
                            className="btn btn-red"
                            type="submit"
                          >
                            بستن
                          </button>
                        </form>
                      </div>
                    </div>
                  </details>
                ))
              )}

            </div>
          </section>

          {/* CONVERSATION */}

          <section className="panel conversation">

            {tickets.length === 0 ? (
              <div className="empty">
                برای شروع، یک تیکت توسط کاربر ایجاد شود.
              </div>
            ) : (
              <>
                {tickets.slice(0, 1).map((ticket) => (
                  <div key={ticket.id}>

                    <div className="conversation-head">

                      <div className="conversation-user">

                        <div className="conversation-avatar">
                          {initials(ticket.user.name)}
                        </div>

                        <div>
                          <strong>
                            {ticket.user.name}
                          </strong>

                          <span>
                            {ticket.user.email}
                          </span>
                        </div>

                      </div>

                      <div className="conversation-title">
                        {ticket.subject}
                      </div>

                      <div className="conversation-info">

                        <span
                          className={`badge ${
                            ticket.status === "OPEN"
                              ? "badge-open"
                              : ticket.status === "PENDING"
                                ? "badge-pending"
                                : "badge-closed"
                          }`}
                        >
                          {statusLabel(ticket.status)}
                        </span>

                        <span className="badge">
                          پلن {planLabel(ticket.user.plan)}
                        </span>

                        <span className="badge">
                          {ticket.messages.length} پیام
                        </span>

                      </div>

                    </div>

                    <div className="messages">

                      {ticket.messages.length === 0 ? (
                        <div className="empty">
                          هنوز پیامی داخل این تیکت ثبت نشده است.
                        </div>
                      ) : (
                        ticket.messages.map((message) => {
                          const isAdmin =
                            message.senderType === "ADMIN";

                          return (
                            <div
                              key={message.id}
                              className={`message ${
                                isAdmin ? "admin" : "user"
                              }`}
                            >
                              <div className="message-label">
                                {isAdmin
                                  ? "پشتیبانی Trading AI"
                                  : ticket.user.name}
                              </div>

                              <div className="message-bubble">
                                {message.message}
                              </div>

                              <div className="message-time">
                                {dateText(message.createdAt)}
                              </div>
                            </div>
                          );
                        })
                      )}

                    </div>

                    <div className="reply">

                      <form action={replyToTicket}>

                        <input
                          type="hidden"
                          name="ticketId"
                          value={ticket.id}
                        />

                        <textarea
                          name="message"
                          required
                          maxLength={5000}
                          placeholder="پاسخ خود را برای کاربر بنویسید..."
                        />

                        <div className="reply-actions">

                          <button
                            type="submit"
                            className="btn btn-primary"
                          >
                            ارسال پاسخ به کاربر
                          </button>

                          <button
                            type="submit"
                            formAction={changeTicketStatus}
                            name="status"
                            value="CLOSED"
                            className="btn btn-red"
                          >
                            بستن تیکت
                          </button>

                        </div>

                      </form>

                    </div>

                    <div className="quick">

                      <Link href="/admin">
                        داشبورد مدیر
                      </Link>

                      <Link href="/admin/users">
                        مدیریت کاربران
                      </Link>

                      <Link href="/admin/plans">
                        مدیریت پلن‌ها
                      </Link>

                    </div>

                  </div>
                ))}
              </>
            )}

          </section>

        </section>

      </div>
    </main>
  );
}
