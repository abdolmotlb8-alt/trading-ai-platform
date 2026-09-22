"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Subscription = {
  active: boolean;
  plan: string;
  startedAt: string | null;
  expiresAt: string | null;
  remainingDays: number | null;
  expired: boolean;
  unlimited: boolean;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  avatarUrl: string | null;
  avatarEmoji: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: Subscription;
};

const EMOJIS = [
  "🤖",
  "🧠",
  "🚀",
  "📈",
  "💎",
  "⚡",
  "🔥",
  "👑",
  "🦁",
  "🐺",
  "🦊",
  "🐉",
  "🌟",
  "💰",
  "🎯",
  "🛡️",
];

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function planLabel(plan: string) {
  switch (plan.toUpperCase()) {
    case "VIP":
      return "VIP";
    case "PRO":
      return "PRO";
    case "PREMIUM":
      return "PREMIUM";
    case "FREE":
    default:
      return "رایگان";
  }
}

function roleLabel(role: string) {
  return role.toUpperCase() === "ADMIN" ? "مدیر سیستم" : "کاربر";
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const subscription = user?.subscription;

  const avatarFallback = useMemo(() => {
    if (selectedEmoji) return selectedEmoji;
    if (user?.avatarEmoji) return user.avatarEmoji;
    return getInitial(user?.name || "");
  }, [selectedEmoji, user?.avatarEmoji, user?.name]);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "دریافت اطلاعات پروفایل ناموفق بود."
        );
      }

      setUser(data.user);
      setName(data.user.name || "");
      setBio(data.user.bio || "");
      setSelectedEmoji(data.user.avatarEmoji || null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت پروفایل."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveProfile() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          bio,
          avatarEmoji: selectedEmoji,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "ذخیره پروفایل ناموفق بود."
        );
      }

      setUser(data.user);
      setName(data.user.name || "");
      setBio(data.user.bio || "");
      setSelectedEmoji(data.user.avatarEmoji || null);

      setMessage("پروفایل با موفقیت ذخیره شد.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره پروفایل."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setError("لطفاً یک فایل تصویری انتخاب کنید.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("حجم عکس نباید بیشتر از ۲ مگابایت باشد.");
      return;
    }

    try {
      setUploading(true);

      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const result = reader.result;

          if (typeof result !== "string") {
            throw new Error("خواندن تصویر ناموفق بود.");
          }

          const response = await fetch("/api/profile", {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              avatarUrl: result,
              avatarEmoji: null,
            }),
          });

          const data = await response.json().catch(() => null);

          if (!response.ok || !data?.success) {
            throw new Error(
              data?.message || "آپلود عکس ناموفق بود."
            );
          }

          setUser(data.user);
          setSelectedEmoji(null);

          setMessage("عکس پروفایل با موفقیت تغییر کرد.");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "آپلود عکس ناموفق بود."
          );
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setUploading(false);
        setError("خواندن فایل تصویر ناموفق بود.");
      };

      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      setError("خطا هنگام انتخاب تصویر.");
    } finally {
      event.target.value = "";
    }
  }

  async function selectEmoji(emoji: string) {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatarEmoji: emoji,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "انتخاب آواتار ناموفق بود."
        );
      }

      setUser(data.user);
      setSelectedEmoji(emoji);
      setShowEmojiPicker(false);

      setMessage("آواتار شما تغییر کرد.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در انتخاب آواتار."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeAvatar() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "حذف آواتار ناموفق بود."
        );
      }

      setUser(data.user);
      setSelectedEmoji(null);

      setMessage("آواتار حذف شد.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در حذف آواتار."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#050b16] text-white flex items-center justify-center px-4"
      >
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
          <h1 className="text-xl font-bold">
            در حال دریافت پروفایل
          </h1>
          <p className="mt-2 text-sm text-white/50">
            لطفاً چند لحظه صبر کنید...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#050b16] text-white flex items-center justify-center px-4"
      >
        <div className="w-full max-w-md rounded-3xl border border-red-400/20 bg-red-500/[0.05] p-8 text-center">
          <div className="mb-4 text-5xl">⚠️</div>

          <h1 className="text-xl font-bold">
            پروفایل قابل دریافت نیست
          </h1>

          <p className="mt-3 text-sm text-white/60">
            {error || "لطفاً دوباره وارد حساب خود شوید."}
          </p>

          <a
            href="/login"
            className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            ورود به حساب
          </a>
        </div>
      </main>
    );
  }

  const avatarSrc =
    user.avatarUrl && user.avatarUrl.startsWith("data:image/")
      ? user.avatarUrl
      : null;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#050b16] text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-100px] top-[-100px] h-[350px] w-[350px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-100px] left-[-100px] h-[350px] w-[350px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-xl shadow-lg shadow-cyan-500/10">
                ◈
              </div>

              <div>
                <p className="text-xs font-medium text-cyan-300">
                  TRADING AI
                </p>

                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  پروفایل کاربری
                </h1>
              </div>
            </div>

            <p className="text-sm text-white/50">
              مدیریت اطلاعات شخصی، آواتار و وضعیت اشتراک
            </p>
          </div>

          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/80 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
          >
            ← بازگشت به داشبورد
          </a>
        </header>

        {/* Messages */}
        {(message || error) && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-red-400/20 bg-red-500/10 text-red-200"
                : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">

          {/* Main Profile */}
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-2xl">

            <div className="border-b border-white/10 bg-gradient-to-l from-cyan-400/[0.08] to-transparent px-5 py-5 sm:px-7">
              <h2 className="text-lg font-black">
                اطلاعات پروفایل
              </h2>

              <p className="mt-1 text-sm text-white/45">
                اطلاعات حساب خود را مدیریت کنید.
              </p>
            </div>

            <div className="p-5 sm:p-7">

              {/* Avatar */}
              <div className="mb-8 flex flex-col items-center">

                <div className="relative">

                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[38px] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-white/[0.03] text-5xl shadow-2xl shadow-cyan-500/10">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="تصویر پروفایل"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      avatarFallback
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || saving}
                    className="absolute -bottom-2 -left-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-cyan-400 text-lg text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:opacity-50"
                    aria-label="تغییر تصویر پروفایل"
                  >
                    {uploading ? "…" : "✎"}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <h2 className="mt-5 text-xl font-black">
                  {user.name}
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  {roleLabel(user.role)}
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowEmojiPicker((value) => !value)
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/70 transition hover:border-cyan-400/30 hover:text-cyan-300"
                  >
                    😊 انتخاب آواتار
                  </button>

                  {(user.avatarUrl || user.avatarEmoji) && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      disabled={saving}
                      className="rounded-xl border border-red-400/10 bg-red-500/[0.05] px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      حذف آواتار
                    </button>
                  )}
                </div>

                {showEmojiPicker && (
                  <div className="mt-5 w-full max-w-md rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-3 text-center text-xs text-white/40">
                      یکی از آواتارهای رایگان را انتخاب کنید
                    </p>

                    <div className="grid grid-cols-8 gap-2">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => selectEmoji(emoji)}
                          className={`flex h-10 items-center justify-center rounded-xl text-xl transition ${
                            selectedEmoji === emoji
                              ? "bg-cyan-400/20 ring-1 ring-cyan-400/50"
                              : "bg-white/[0.04] hover:bg-white/[0.08]"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="space-y-5">

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">
                    👤 نام کاربر
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    maxLength={80}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-white/20 focus:border-cyan-400/50 focus:bg-cyan-400/[0.03]"
                    placeholder="نام خود را وارد کنید"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">
                    ✉️ ایمیل
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3.5">
                    <span className="text-lg">✉️</span>

                    <span className="min-w-0 flex-1 truncate text-sm text-white/55">
                      {user.email}
                    </span>

                    <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                      تأیید شده
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">
                    📝 درباره من
                  </label>

                  <textarea
                    value={bio}
                    onChange={(event) =>
                      setBio(event.target.value)
                    }
                    maxLength={500}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-white/20 focus:border-cyan-400/50 focus:bg-cyan-400/[0.03]"
                    placeholder="یک توضیح کوتاه درباره خودتان بنویسید..."
                  />

                  <div className="mt-1 text-left text-[11px] text-white/30">
                    {bio.length}/500
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving || uploading}
                  className="w-full rounded-2xl bg-gradient-to-l from-cyan-400 to-blue-500 px-5 py-4 font-black text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "در حال ذخیره..."
                    : "ذخیره تغییرات"}
                </button>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">

            {/* Subscription */}
            <section className="overflow-hidden rounded-[28px] border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.10] via-white/[0.035] to-blue-500/[0.05] p-6 shadow-2xl shadow-cyan-500/5 backdrop-blur-2xl">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-xs font-bold text-cyan-300">
                    SUBSCRIPTION
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    اشتراک شما
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-2xl">
                  💎
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">
                    نوع اشتراک
                  </span>

                  <span className="font-black text-cyan-300">
                    {planLabel(user.plan)}
                  </span>
                </div>

                <div className="my-4 h-px bg-white/10" />

                {subscription?.unlimited ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">
                      وضعیت
                    </span>

                    <span className="font-bold text-emerald-300">
                      نامحدود
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">
                        وضعیت
                      </span>

                      <span
                        className={`font-bold ${
                          subscription?.active
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {subscription?.active
                          ? "فعال"
                          : "منقضی"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-white/50">
                        باقی‌مانده
                      </span>

                      <span className="font-black">
                        {subscription?.remainingDays !== null &&
                        subscription?.remainingDays !== undefined
                          ? `${subscription.remainingDays} روز`
                          : "—"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-5 space-y-3 text-sm">

                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    شروع اشتراک
                  </span>

                  <span className="text-white/70">
                    {formatDate(
                      subscription?.startedAt || null
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    پایان اشتراک
                  </span>

                  <span className="text-white/70">
                    {subscription?.unlimited
                      ? "نامحدود"
                      : formatDate(
                          subscription?.expiresAt || null
                        )}
                  </span>
                </div>
              </div>

              {user.plan === "FREE" && (
                <a
                  href="/payments"
                  className="mt-6 block rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400/15"
                >
                  ارتقای اشتراک
                </a>
              )}
            </section>

            {/* Account */}
            <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">

              <h2 className="text-lg font-black">
                امنیت و حساب
              </h2>

              <div className="mt-5 space-y-3">

                <a
                  href="/forgot-password"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-4 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🔐</span>
                    <span className="text-sm font-bold">
                      فراموشی رمز عبور
                    </span>
                  </span>

                  <span className="text-white/30">
                    ←
                  </span>
                </a>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🛡️</span>
                    <span className="text-sm font-bold">
                      نقش حساب
                    </span>
                  </span>

                  <span className="rounded-lg bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
                    {roleLabel(user.role)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                  <span className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <span className="text-sm font-bold">
                      عضویت از
                    </span>
                  </span>

                  <span className="text-xs text-white/45">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            </section>

            {/* Account ID */}
            <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">

              <p className="text-xs text-white/35">
                شناسه حساب
              </p>

              <p className="mt-2 break-all font-mono text-xs text-white/50">
                {user.id}
              </p>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}
