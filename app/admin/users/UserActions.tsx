"use client";

import { useState } from "react";

type Props = {
  userId: string;
  currentRole: string;
  currentPlan: string;
};

export default function UserActions({
  userId,
  currentRole,
  currentPlan,
}: Props) {
  const [role, setRole] = useState(currentRole);
  const [plan, setPlan] = useState(currentPlan);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function updateUser() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          plan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "خطا در تغییر اطلاعات");
        return;
      }

      setMessage("تغییرات با موفقیت ذخیره شد ✅");
    } catch {
      setMessage("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "18px",
        paddingTop: "16px",
        borderTop: "1px solid #172f44",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        <label
          style={{
            display: "block",
            color: "#94a3b8",
            fontSize: "13px",
          }}
        >
          نقش کاربر

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              width: "100%",
              marginTop: "8px",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid #24415a",
              background: "#081827",
              color: "#f8fafc",
              fontSize: "14px",
            }}
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>

        <label
          style={{
            display: "block",
            color: "#94a3b8",
            fontSize: "13px",
          }}
        >
          پلن کاربر

          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            style={{
              width: "100%",
              marginTop: "8px",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid #24415a",
              background: "#081827",
              color: "#f8fafc",
              fontSize: "14px",
            }}
          >
            <option value="FREE">FREE</option>
            <option value="VIP">VIP</option>
            <option value="PREMIUM">PREMIUM</option>
            <option value="LIFETIME">LIFETIME</option>
          </select>
        </label>
      </div>

      <button
        onClick={updateUser}
        disabled={loading}
        style={{
          width: "100%",
          marginTop: "14px",
          padding: "13px",
          border: "none",
          borderRadius: "12px",
          background: loading ? "#164e63" : "#0891b2",
          color: "#fff",
          fontWeight: "700",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </button>

      {message && (
        <div
          style={{
            marginTop: "12px",
            padding: "11px",
            borderRadius: "10px",
            background: "#0d1d2d",
            color: message.includes("موفقیت")
              ? "#22d3ee"
              : "#f87171",
            fontSize: "13px",
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
