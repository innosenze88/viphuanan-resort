"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId?: string;
  guestId?: string;
  onSuccess?: (documentId: string) => void;
};

const DOC_TYPES = [
  { value: "PAYMENT_SLIP", label: "สลิปโอนเงิน" },
  { value: "INVOICE", label: "ใบแจ้งหนี้" },
  { value: "RECEIPT", label: "ใบเสร็จ" },
  { value: "GUEST_ID", label: "บัตรประจำตัว" },
  { value: "CONTRACT", label: "สัญญา" },
  { value: "OTHER", label: "อื่นๆ" },
];

export function DocumentUpload({ bookingId, guestId, onSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ documentId: string; confidence: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File, docType: string) {
    setUploading(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentType", docType);
    if (bookingId) fd.append("bookingId", bookingId);
    if (guestId) fd.append("guestId", guestId);

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        setResult(json);
        onSuccess?.(json.documentId);
        router.refresh();
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const docType = (form.elements.namedItem("documentType") as HTMLSelectElement).value;
    if (!fileInput.files?.[0]) return;
    upload(fileInput.files[0], docType);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const form = document.getElementById("doc-upload-form") as HTMLFormElement;
    const docType = (form?.elements.namedItem("documentType") as HTMLSelectElement)?.value ?? "OTHER";
    upload(file, docType);
  }

  return (
    <form id="doc-upload-form" onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทเอกสาร</label>
        <select
          name="documentType"
          defaultValue="OTHER"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          required
        />
        <div className="text-gray-400 text-sm">
          {uploading ? (
            <span className="text-blue-600">กำลังอัปโหลดและวิเคราะห์...</span>
          ) : (
            <>
              <div className="text-2xl mb-2">📄</div>
              <div>ลากไฟล์มาวางที่นี่ หรือ <span className="text-blue-600 underline">เลือกไฟล์</span></div>
              <div className="text-xs mt-1">JPG, PNG, WEBP, PDF — สูงสุด 20 MB</div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          อัปโหลดสำเร็จ · ความเชื่อมั่น OCR: {(result.confidence * 100).toFixed(1)}%
          {" · "}
          <a href={`/documents/${result.documentId}`} className="underline font-medium">
            ดูเอกสาร
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {uploading ? "กำลังประมวลผล..." : "อัปโหลดเอกสาร"}
      </button>
    </form>
  );
}
