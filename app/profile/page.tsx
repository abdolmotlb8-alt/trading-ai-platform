"use client";

import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Subscription = {
  plan?: string | null;
  status?: string | null;
  startedAt?: string | null;
  expiresAt?: string | null;
  remainingDays?: number | null;
};

type ProfileUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  plan?: string | null;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  bio?: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionExpiresAt?: string | null;
};

type ProfileResponse = {
  user?: ProfileUser;
  subscription?: Subscription;
  allowedEmojis?: string[];
};

const DEFAULT_EMOJIS = [
  "😎",
  "🤖",
  "🧠",
  "🚀",
  "💎",
  "🔥",
  "🦾",
  "🐺",
  "🦊",
  "👑",
  "⚡",
  "🎯",
];

function Icon({
  name,
  size = 20,
}: {
  name:
    | "user"
    | "mail"
    | "shield"
    | "calendar"
    | "clock"
    | "camera"
    | "image"
    | "save"
    | "crown"
    | "chart"
    | "bell"
    | "settings"
    | "logout"
    | "support"
    | "history"
    | "wallet"
    | "devices"
    | "check"
    | "diamond"
    | "rocket"
    | "lock"
    | "menu"
    | "close"
    | "spark";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c.8-4.1 3.4-6 8-6s7.2 1.9 8 6" />
        </svg>
      );

    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5.2-3.2 8.7-8 10-4.8-1.3-8-4.8-8-10V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" />
          <circle cx="12" cy="13.5" r="3.5" />
        </svg>
      );

    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="m4 17 5-5 4 4 2-2 5 5" />
        </svg>
      );

    case "save":
      return (
        <svg {...common}>
          <path d="M5 3h11l3 3v15H5V3Z" />
          <path d="M8 3v6h8V3M8 21v-7h8v7" />
        </svg>
      );

    case "crown":
      return (
        <svg {...common}>
          <path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z" />
          <path d="M5 19h14" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="m7 15 4-4 3 2 5-7" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
          <path d="m4.9 4.9 2 2M17.1 17.1l2 2M4 12H1M23 12h-3M4.9 19.1l2-2M17.1 6.9l2-2M12 1v3M12 20v3" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 4H5v16h5" />
          <path d="m14 8 4 4-4 4M18 12H9" />
        </svg>
      );

    case "support":
      return (
        <svg {...common}>
          <path d="M4 5h16v11H8l-4 4V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      );

    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "wallet":
      return (
        <svg {...common}>
          <path d="M4 6h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M2 7V5a2 2 0 0 1 2-2h12" />
          <path d="M16 12h5" />
        </svg>
      );

    case "devices":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="14" height="11" rx="2" />
          <path d="M7 20h6M10 15v5M19 8h2v11h-6v-2" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "diamond":
      return (
        <svg {...common}>
          <path d="m12 3 8 6-8 12L4 9l8-6Z" />
          <path d="m4 9 8 3 8-3M12 3v9" />
        </svg>
      );

    case "rocket":
      return (
        <svg {...common}>
          <path d="M14 4c3-2 6-2 6-2s0 3-2 6l-6 6-4-4 6-6Z" />
          <path d="m8 10-4 1-2 4 5-1M14 16l-1 5 4-2 1-4" />
          <circle cx="16" cy="7" r="1.2" />
        </svg>
      );

    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path d="m12 2 1.4 6.6L20 10l-6.6 1.4L12 18l-1.4-6.6L4 10l6.6-1.4L12 2Z" />
          <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
        </svg>
      );

    default:
      return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function calculateRemainingDays(expiresAt?: string | null) {
  if (!expiresAt) return null;

  const end = new Date(expiresAt).getTime();

  if (Number.isNaN(end)) return null;

  const now = Date.now();
  const difference = end - now;

  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
}

function getPlanLabel(plan?: string | null) {
  const normalized = String(plan || "FREE").toUpperCase();

  if (normalized === "PRO") return "PRO";
  if (normalized === "VIP") return "VIP";
  if (normalized === "PREMIUM") return "PREMIUM";

  return "رایگان";
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("😎");

  const [emojis, setEmojis] = useState<string[]>(DEFAULT_EMOJIS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/profile", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "دریافت اطلاعات پروفایل انجام نشد.");
      }

      const profileUser = data?.user || data?.profile || null;
      const profileSubscription = data?.subscription || null;

      setUser(profileUser);

      setName(profileUser?.name || "");
      setBio(profileUser?.bio || "");

      setAvatarUrl(profileUser?.avatarUrl || "");
      setAvatarEmoji(profileUser?.avatarEmoji || "😎");

      setSubscription(profileSubscription);

      if (
        Array.isArray(data?.allowedEmojis) &&
        data.allowedEmojis.length > 0
      ) {
        setEmojis(data.allowedEmojis);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات پروفایل."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("فرمت تصویر باید JPG، PNG، WEBP یا GIF باشد.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("حجم تصویر نباید بیشتر از ۲ مگابایت باشد.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result === "string") {
          setAvatarUrl(result);
          setAvatarEmoji("");
          setMessage("تصویر انتخاب شد؛ برای ثبت نهایی روی ذخیره تغییرات بزنید.");
        }

        setUploading(false);
      };

      reader.onerror = () => {
        setUploading(false);
        setError("خواندن تصویر انجام نشد.");
      };

      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      setError("آپلود تصویر با خطا مواجه شد.");
    }

    event.target.value = "";
  }

  function selectEmoji(emoji: string) {
    setAvatarEmoji(emoji);
    setAvatarUrl("");
    setEmojiOpen(false);
    setMessage("ایموجی انتخاب شد؛ برای ثبت نهایی ذخیره تغییرات را بزنید.");
  }

  async function saveProfile(event?: FormEvent) {
    event?.preventDefault();

    setMessage("");
    setError("");

    if (!name.trim()) {
      setError("نام کاربری نمی‌تواند خالی باشد.");
      return;
    }

    if (name.trim().length < 2) {
      setError("نام کاربری باید حداقل ۲ کاراکتر باشد.");
      return;
    }

    if (bio.length > 500) {
      setError("توضیحات شما نباید بیشتر از ۵۰۰ کاراکتر باشد.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          avatarUrl: avatarUrl || null,
          avatarEmoji: avatarEmoji || null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "ذخیره اطلاعات انجام نشد.");
      }

      if (data?.user) {
        setUser(data.user);
        setName(data.user.name || "");
        setBio(data.user.bio || "");
        setAvatarUrl(data.user.avatarUrl || "");
        setAvatarEmoji(data.user.avatarEmoji || "😎");
      }

      if (data?.subscription) {
        setSubscription(data.subscription);
      }

      setMessage("تغییرات پروفایل با موفقیت ذخیره شد.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ذخیره تغییرات با خطا مواجه شد."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeAvatar() {
    setError("");
    setMessage("");

    try {
      setSaving(true);

      const response = await fetch("/api/profile", {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "حذف تصویر انجام نشد.");
      }

      setAvatarUrl("");
      setAvatarEmoji("😎");

      if (data?.user) {
        setUser(data.user);
      }

      setMessage("تصویر پروفایل حذف شد.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حذف تصویر انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  }

  const plan = useMemo(() => {
    return subscription?.plan || user?.plan || "FREE";
  }, [subscription, user]);

  const planLabel = getPlanLabel(plan);

  const remainingDays = useMemo(() => {
    if (typeof subscription?.remainingDays === "number") {
      return Math.max(0, subscription.remainingDays);
    }

    return calculateRemainingDays(
      subscription?.expiresAt || user?.subscriptionExpiresAt
    );
  }, [subscription, user]);

  const isPaidPlan =
    String(plan).toUpperCase() !== "FREE" &&
    String(plan).toUpperCase() !== "";

  const displayAvatar = avatarUrl || user?.avatarUrl || "";
  const displayEmoji = avatarEmoji || user?.avatarEmoji || "😎";

  const initials =
    name.trim().charAt(0) ||
    user?.email?.charAt(0).toUpperCase() ||
    "U";

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#030712] text-white flex items-center justify-center px-5"
      >
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-500/20">
            <Icon name="spark" size={30} />
          </div>

          <div className="h-2 w-40 mx-auto rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 animate-pulse" />
          </div>

          <p className="mt-5 text-sm text-slate-400">
            در حال بارگذاری پروفایل...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#030712] text-white"
    >
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-700/10 blur-3xl" />
        <div className="absolute left-0 top-[35%] h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute right-[35%] bottom-0 h-96 w-96 rounded-full bg-fuchsia-700/5 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 px-3 sm:px-5 lg:px-7 pt-3">
        <div className="mx-auto max-w-[1500px] rounded-2xl border border-white/[0.08] bg-[#07101e]/90 backdrop-blur-2xl shadow-2xl shadow-black/30">
          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 shrink-0"
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-600/20">
                <span className="text-xl font-black">AI</span>
                <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-[#07101e] bg-emerald-400" />
              </div>

              <div className="hidden sm:block">
                <div className="text-[15px] font-black tracking-wide">
                  TRADING AI
                </div>
                <div className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
                  Smart Trading Platform
                </div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              <NavLink href="/dashboard">داشبورد</NavLink>
              <NavLink href="/bots">ربات‌ها</NavLink>
              <NavLink href="/signals">سیگنال‌ها</NavLink>
              <NavLink href="/subscription">اشتراک</NavLink>
              <NavLink href="/settings">تنظیمات</NavLink>
              <NavLink href="/profile" active>
                پروفایل
              </NavLink>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="relative hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] transition"
                aria-label="اعلان‌ها"
              >
                <Icon name="bell" size={18} />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#07101e]" />
              </button>

              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold overflow-hidden">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt="پروفایل"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayEmoji
                  )}
                </div>

                <div className="text-right leading-tight">
                  <div className="max-w-[100px] truncate text-xs font-bold">
                    {name || "کاربر"}
                  </div>
                  <div className="text-[9px] text-violet-400">
                    {planLabel}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenu((value) => !value)}
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300"
                aria-label="منو"
              >
                <Icon name={mobileMenu ? "close" : "menu"} size={20} />
              </button>
            </div>
          </div>

          {mobileMenu && (
            <div className="lg:hidden border-t border-white/[0.07] px-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <MobileNav href="/dashboard">داشبورد</MobileNav>
                <MobileNav href="/bots">ربات‌ها</MobileNav>
                <MobileNav href="/signals">سیگنال‌ها</MobileNav>
                <MobileNav href="/subscription">اشتراک</MobileNav>
                <MobileNav href="/settings">تنظیمات</MobileNav>
                <MobileNav href="/profile">پروفایل</MobileNav>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-3 sm:px-5 lg:px-7 pb-10">
        {/* PAGE TITLE */}
        <section className="py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                <Link
                  href="/dashboard"
                  className="hover:text-violet-400 transition"
                >
                  خانه
                </Link>
                <span>/</span>
                <span className="text-slate-400">پروفایل</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-400">
                  <Icon name="user" size={27} />
                </div>

                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                    پروفایل کاربری
                  </h1>
                  <p className="mt-2 text-sm text-slate-400">
                    مدیریت اطلاعات شخصی، امنیت حساب و وضعیت اشتراک
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              <span className="text-xs text-emerald-300">
                حساب شما فعال است
              </span>
            </div>
          </div>
        </section>

        {/* MESSAGES */}
        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-5">
          {/* SIDEBAR */}
          <aside className="space-y-5">
            {/* SUBSCRIPTION */}
            <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/80 via-[#111333] to-[#07101e] p-5 shadow-2xl shadow-violet-950/10">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-600/20 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    اشتراک فعلی
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-yellow-300">
                    <Icon name="crown" size={21} />
                  </div>
                </div>

                <div className="mt-7 text-center">
                  <div className="text-3xl font-black tracking-wide">
                    {planLabel}
                  </div>

                  <div className="mt-2 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
                    {isPaidPlan ? "فعال" : "رایگان"}
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                  <SubscriptionRow
                    icon="calendar"
                    label="شروع اشتراک"
                    value={formatDate(
                      subscription?.startedAt ||
                        user?.subscriptionStartedAt
                    )}
                  />

                  <SubscriptionRow
                    icon="calendar"
                    label="پایان اشتراک"
                    value={formatDate(
                      subscription?.expiresAt ||
                        user?.subscriptionExpiresAt
                    )}
                  />

                  <SubscriptionRow
                    icon="clock"
                    label="باقی‌مانده"
                    value={
                      remainingDays === null
                        ? "نامحدود"
                        : `${remainingDays} روز`
                    }
                  />
                </div>

                <Link
                  href="/subscription"
                  className="mt-5 flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-bold shadow-lg shadow-violet-600/20 transition hover:brightness-110"
                >
                  مدیریت اشتراک
                </Link>
              </div>
            </div>

            {/* SECURITY */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#07101e]/80 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">امنیت حساب</h2>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Icon name="shield" size={19} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <SecurityRow
                  icon="lock"
                  title="رمز عبور"
                  description="حساب شما با رمز عبور محافظت می‌شود"
                />

                <SecurityRow
                  icon="shield"
                  title="امنیت حساب"
                  description="وضعیت امنیتی حساب فعال است"
                />
              </div>

              <Link
                href="/settings"
                className="mt-4 flex h-11 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/[0.06] text-sm font-bold text-violet-300 hover:bg-violet-500/10 transition"
              >
                تنظیمات امنیتی
              </Link>
            </div>

            {/* QUICK ACCESS */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#07101e]/80 p-5 backdrop-blur-xl">
              <h2 className="font-bold">دسترسی سریع</h2>

              <div className="mt-4 space-y-1">
                <QuickLink
                  href="/dashboard"
                  icon="chart"
                  label="داشبورد"
                />

                <QuickLink
                  href="/bots"
                  icon="spark"
                  label="ربات‌های معاملاتی"
                />

                <QuickLink
                  href="/subscription"
                  icon="diamond"
                  label="حساب‌های پرداخت"
                />

                <QuickLink
                  href="/support"
                  icon="support"
                  label="مرکز پشتیبانی"
                />

                <QuickLink
                  href="/settings"
                  icon="settings"
                  label="تنظیمات"
                />
              </div>
            </div>

            {/* ACCOUNT STATS */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#07101e]/80 p-5 backdrop-blur-xl">
              <h2 className="font-bold">وضعیت حساب</h2>

              <div className="mt-4 space-y-3">
                <StatRow
                  value={isPaidPlan ? "PRO" : "FREE"}
                  label="پلن فعال"
                  valueClass="text-violet-300"
                />

                <StatRow
                  value={remainingDays === null ? "∞" : String(remainingDays)}
                  label="روز باقی‌مانده"
                  valueClass="text-blue-300"
                />

                <StatRow
                  value="✓"
                  label="حساب تأیید شده"
                  valueClass="text-emerald-300"
                />
              </div>
            </div>
          </aside>

          {/* CONTENT */}
          <section className="space-y-5">
            {/* PROFILE FORM */}
            <form
              onSubmit={saveProfile}
              className="rounded-3xl border border-white/[0.08] bg-[#07101e]/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20"
            >
              <div className="border-b border-white/[0.07] px-5 sm:px-7 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">اطلاعات پروفایل</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      اطلاعات حساب خود را شخصی‌سازی کنید
                    </p>
                  </div>

                  <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Icon name="user" size={20} />
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                {/* AVATAR */}
                <div className="flex flex-col items-center">
                  <div className="text-sm font-bold text-slate-200">
                    تصویر پروفایل
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    عکس یا ایموجی دلخواه خود را انتخاب کنید
                  </div>

                  <div className="relative mt-6">
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 opacity-60 blur-sm" />

                    <div className="relative flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center overflow-hidden rounded-full border-4 border-[#08111f] bg-gradient-to-br from-violet-600/20 to-blue-600/20 shadow-2xl">
                      {displayAvatar ? (
                        <img
                          src={displayAvatar}
                          alt="تصویر پروفایل"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-7xl">{displayEmoji}</span>
                      )}
                    </div>

                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-4 border-[#07101e] bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-xl transition hover:scale-105"
                      title="انتخاب تصویر"
                    >
                      <Icon name="camera" size={18} />

                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {uploading && (
                    <div className="mt-3 text-xs text-blue-300">
                      در حال آماده‌سازی تصویر...
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <label
                      htmlFor="avatar-upload-2"
                      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-4 text-xs font-bold text-violet-300 transition hover:bg-violet-500/[0.14]"
                    >
                      <Icon name="image" size={16} />
                      انتخاب عکس

                      <input
                        id="avatar-upload-2"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setEmojiOpen((value) => !value)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.08] px-4 text-xs font-bold text-blue-300 transition hover:bg-blue-500/[0.14]"
                    >
                      <span>☺</span>
                      انتخاب ایموجی
                    </button>

                    {(displayAvatar || user?.avatarUrl) && (
                      <button
                        type="button"
                        onClick={removeAvatar}
                        disabled={saving}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 text-xs font-bold text-red-300 transition hover:bg-red-500/[0.12] disabled:opacity-50"
                      >
                        حذف عکس
                      </button>
                    )}
                  </div>

                  <div className="mt-3 text-[11px] text-slate-600">
                    JPG / PNG / WEBP / GIF • حداکثر ۲ مگابایت
                  </div>

                  {emojiOpen && (
                    <div className="mt-5 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#050b15] p-4">
                      <div className="mb-3 text-xs font-bold text-slate-400">
                        ایموجی پروفایل
                      </div>

                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                        {emojis.map((emoji) => (
                          <button
                            type="button"
                            key={emoji}
                            onClick={() => selectEmoji(emoji)}
                            className={`flex h-11 items-center justify-center rounded-xl border text-2xl transition ${
                              displayEmoji === emoji && !displayAvatar
                                ? "border-violet-500 bg-violet-500/15 scale-105"
                                : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08]"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="my-7 h-px bg-white/[0.07]" />

                {/* NAME */}
                <div>
                  <label
                    htmlFor="profile-name"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    نام کاربری
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                      <Icon name="user" size={18} />
                    </div>

                    <input
                      id="profile-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={80}
                      className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#040b15] pr-12 pl-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5"
                      placeholder="نام خود را وارد کنید"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="mt-5">
                  <label
                    htmlFor="profile-email"
                    className="mb-2 block text-xs font-bold text-slate-300"
                  >
                    ایمیل
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                      <Icon name="mail" size={18} />
                    </div>

                    <input
                      id="profile-email"
                      value={user?.email || ""}
                      readOnly
                      className="h-12 w-full cursor-not-allowed rounded-xl border border-white/[0.06] bg-white/[0.025] pr-12 pl-4 text-sm text-slate-400 outline-none"
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <Icon name="check" size={13} />
                    ایمیل ثبت‌شده حساب
                  </div>
                </div>

                {/* BIO */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="profile-bio"
                      className="block text-xs font-bold text-slate-300"
                    >
                      درباره من
                    </label>

                    <span className="text-[10px] text-slate-600">
                      {bio.length}/500
                    </span>
                  </div>

                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    maxLength={500}
                    rows={5}
                    placeholder="یک توضیح کوتاه درباره خودتان بنویسید..."
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#040b15] p-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5"
                  />
                </div>

                {/* SAVE */}
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-sm font-black shadow-xl shadow-violet-600/15 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="save" size={18} />
                  {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </div>
            </form>

            {/* PRO BENEFITS */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#07101e]/80 p-5 sm:p-7 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon
                      name="diamond"
                      size={22}
                    />

                    <h2 className="text-xl font-black text-violet-300">
                      مزایای اشتراک PRO
                    </h2>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    امکانات حرفه‌ای Trading AI برای حساب شما
                  </p>
                </div>

                <span className="w-fit rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold text-violet-300">
                  {isPaidPlan ? "فعال" : "قابل ارتقا"}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Benefit
                  title="تحلیل‌های پیشرفته"
                  description="دسترسی به ابزارهای تحلیل حرفه‌ای"
                />

                <Benefit
                  title="هشدارهای هوشمند"
                  description="اعلان‌های لحظه‌ای و هوشمند"
                />

                <Benefit
                  title="بدون تبلیغات"
                  description="تجربه کاربری بدون مزاحمت تبلیغات"
                />

                <Benefit
                  title="داده‌های لحظه‌ای"
                  description="دسترسی سریع به داده‌های بازار"
                />

                <Benefit
                  title="ربات‌های نامحدود"
                  description="مدیریت ربات‌های معاملاتی"
                />

                <Benefit
                  title="سیگنال‌های پیشرفته"
                  description="سیگنال‌های دقیق‌تر و حرفه‌ای"
                />

                <Benefit
                  title="پشتیبانی ویژه"
                  description="پشتیبانی سریع‌تر برای کاربران"
                />

                <Benefit
                  title="دسترسی API"
                  description="امکانات اتصال برای کاربران حرفه‌ای"
                />
              </div>

              <Link
                href="/subscription"
                className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-black shadow-xl shadow-violet-600/10 transition hover:brightness-110"
              >
                <Icon name={isPaidPlan ? "rocket" : "diamond"} size={18} />
                {isPaidPlan ? "ارتقا / تمدید اشتراک" : "ارتقا به PRO"}
              </Link>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="mt-5 rounded-3xl border border-white/[0.08] bg-[#07101e]/80 p-6 sm:p-8 backdrop-blur-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-black">
                  AI
                </div>

                <div>
                  <div className="font-black">TRADING AI</div>
                  <div className="text-[9px] tracking-[0.2em] text-slate-600">
                    SMART PLATFORM
                  </div>
                </div>
              </div>

              <p className="mt-4 max-w-xs text-xs leading-6 text-slate-500">
                پلتفرم هوشمند برای تحلیل بازار، مدیریت ربات‌های معاملاتی و
                دریافت سیگنال‌های حرفه‌ای.
              </p>
            </div>

            <FooterColumn
              title="پشتیبانی"
              links={[
                ["مرکز راهنما", "/support"],
                ["ارسال تیکت", "/support"],
                ["وضعیت سرویس", "/dashboard"],
                ["پیشنهادات", "/support"],
              ]}
            />

            <FooterColumn
              title="محصولات"
              links={[
                ["ربات‌های معاملاتی", "/bots"],
                ["سیگنال‌ها", "/signals"],
                ["تحلیل بازار", "/market"],
                ["دسترسی API", "/api"],
              ]}
            />

            <FooterColumn
              title="حساب"
              links={[
                ["پروفایل", "/profile"],
                ["تنظیمات", "/settings"],
                ["اشتراک", "/subscription"],
                ["امنیت حساب", "/settings"],
              ]}
            />
          </div>

          <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/[0.07] pt-5 text-[11px] text-slate-600">
            <span>© 1405 Trading AI — تمامی حقوق محفوظ است.</span>
            <span>نسخه 2.0</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function NavLink({
  href,
  children,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-violet-600/15"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNav({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-center text-xs font-bold text-slate-300 hover:bg-white/[0.07] transition"
    >
      {children}
    </Link>
  );
}

function SubscriptionRow({
  icon,
  label,
  value,
}: {
  icon: "calendar" | "clock";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon name={icon} size={15} />
        <span>{label}</span>
      </div>

      <span className="font-bold text-slate-200">{value}</span>
    </div>
  );
}

function SecurityRow({
  icon,
  title,
  description,
}: {
  icon: "lock" | "shield";
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
        <Icon name={icon} size={18} />
      </div>

      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-200">{title}</div>
        <div className="mt-1 text-[10px] leading-5 text-slate-500">
          {description}
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon:
    | "chart"
    | "spark"
    | "wallet"
    | "support"
    | "settings";
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
    >
      <span className="text-violet-400">
        <Icon name={icon} size={17} />
      </span>
      <span>{label}</span>
    </Link>
  );
}

function StatRow({
  value,
  label,
  valueClass,
}: {
  value: string;
  label: string;
  valueClass: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-black ${valueClass}`}>{value}</span>
    </div>
  );
}

function Benefit({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-violet-500/20 hover:bg-violet-500/[0.03]">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
        <Icon name="check" size={16} />
      </div>

      <div>
        <div className="text-xs font-bold text-slate-200">{title}</div>
        <div className="mt-1 text-[10px] leading-5 text-slate-500">
          {description}
        </div>
      </div>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-black text-slate-200">{title}</h3>

      <div className="space-y-3">
        {links.map(([label, href]) => (
          <Link
            key={`${label}-${href}`}
            href={href}
            className="block text-xs text-slate-500 transition hover:text-violet-300"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
