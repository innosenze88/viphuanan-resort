"use client";

export function PrintButton({ label = "🖨 พิมพ์" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{
        display: "block",
        margin: "16px auto",
        background: "#2563eb",
        color: "#fff",
        border: "none",
        padding: "10px 24px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
      }}
    >
      {label}
    </button>
  );
}
