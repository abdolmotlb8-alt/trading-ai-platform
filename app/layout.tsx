import "./globals.css";

export const metadata = {
  title: "Trading AI Platform",
  description: "AI Trading Signals and Market Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {children}
      </body>
    </html>
  );
}
