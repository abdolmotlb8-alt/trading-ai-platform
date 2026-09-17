export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#06111f",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "#0a1929",
          border: "1px solid #17304a",
          borderRadius: "24px",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>
          🛡️
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "30px",
          }}
        >
          پنل مدیریت Trading AI
        </h1>

        <p
          style={{
            color: "#94a3b8",
            fontSize: "17px",
            marginTop: "15px",
            lineHeight: 1.8,
          }}
        >
          تست پنل مدیریت با موفقیت اجرا شد.
        </p>

        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            borderRadius: "14px",
            background: "#082536",
            border: "1px solid #16465b",
            color: "#22d3ee",
            fontWeight: "700",
          }}
        >
          ADMIN ROUTE OK
        </div>
      </div>
    </main>
  );
}
