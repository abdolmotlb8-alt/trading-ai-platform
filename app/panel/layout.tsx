import Link from "next/link";

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div dir="rtl" className="min-h-screen bg-black text-white">

      {/* Desktop Sidebar */}
      <aside className="fixed right-0 top-0 hidden h-screen w-64 border-l border-yellow-500/20 bg-zinc-950 lg:block">

        <div className="flex h-full flex-col">

          {/* Logo */}
          <div className="border-b border-zinc-800 p-6">

            <Link href="/panel" className="block">
              <div className="text-2xl font-black text-yellow-400">
                Trading AI
              </div>

              <div className="mt-1 text-xs text-gray-500">
                پنل هوشمند معامله‌گری
              </div>
            </Link>

          </div>


          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">

            <div className="mb-3 px-3 text-xs font-bold text-gray-600">
              اصلی
            </div>

            <SidebarLink
              href="/panel"
              icon="⌂"
              title="داشبورد"
            />

            <SidebarLink
              href="/market"
              icon="📊"
              title="بازارها"
            />

            <SidebarLink
              href="/ai-analysis"
              icon="🧠"
              title="تحلیل AI"
            />

            <SidebarLink
              href="/signals"
              icon="📡"
              title="سیگنال‌ها"
            />


            <div className="mb-3 mt-7 px-3 text-xs font-bold text-gray-600">
              معامله‌گری
            </div>

            <SidebarLink
              href="/bots"
              icon="🤖"
              title="ربات‌ها"
            />

            <SidebarLink
              href="/bot-builder"
              icon="⚙️"
              title="ساخت ربات"
            />

            <SidebarLink
              href="/trades"
              icon="💹"
              title="معاملات"
            />

            <SidebarLink
              href="/performance"
              icon="📈"
              title="عملکرد"
            />

            <SidebarLink
              href="/reports"
              icon="📋"
              title="گزارش‌ها"
            />

            <SidebarLink
              href="/risk"
              icon="🛡️"
              title="مدیریت ریسک"
            />


            <div className="mb-3 mt-7 px-3 text-xs font-bold text-gray-600">
              خدمات
            </div>

            <SidebarLink
              href="/broker"
              icon="🏦"
              title="کارگزاری"
            />

            <SidebarLink
              href="/telegram"
              icon="✈️"
              title="تلگرام"
            />

            <SidebarLink
              href="/subscription"
              icon="💎"
