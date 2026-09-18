import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Payment, Deposit } from "@prisma/client";

type Props = {
  grossAmount: number;
  payments: Payment[];
  deposit: Deposit | null;
};

export function PaymentSummary({ grossAmount, payments, deposit }: Props) {
  const verifiedPayments = payments.filter((p) => p.status !== "FAILED" && p.status !== "CANCELLED");
  const totalPaid = verifiedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const depositAmount = deposit ? Number(deposit.amount) : 0;

  // Outstanding = grossAmount - totalPaid
  // Deposit is already included in totalPaid (it was a payment) — NOT added separately
  const outstanding = Math.max(0, grossAmount - totalPaid);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide font-medium">
        สรุปการชำระเงิน
      </div>

      {/* Financial summary table */}
      <div className="px-5 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">ยอดรวมค่าห้อง</span>
          <span className="font-medium text-gray-900">{formatCurrency(grossAmount)}</span>
        </div>
        {depositAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              มัดจำ{" "}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                deposit?.status === "APPLIED" ? "bg-green-100 text-green-700" :
                deposit?.status === "RECEIVED" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {deposit?.status}
              </span>
            </span>
            <span className="text-gray-700">-{formatCurrency(depositAmount)}</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
          <span className="text-gray-600">ชำระแล้ว (รวมทั้งหมด)</span>
          <span className="font-semibold text-green-700">{formatCurrency(totalPaid)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-gray-800">ยอดค้างชำระ</span>
          <span className={`font-bold text-lg ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
            {outstanding > 0 ? formatCurrency(outstanding) : "ชำระครบแล้ว"}
          </span>
        </div>
      </div>

      {/* Payment list */}
      {verifiedPayments.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="px-5 py-2 text-xs text-gray-400 uppercase tracking-wide">ประวัติการชำระ</div>
          <div className="divide-y divide-gray-50">
            {verifiedPayments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {formatCurrency(Number(p.amount))}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      p.status === "VERIFIED" ? "bg-green-100 text-green-700" :
                      p.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      p.status === "REFUNDED" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {methodLabel(p.method as string)} · {purposeLabel(p.purpose as string)}
                    {p.paidAt && <> · {formatDateTime(p.paidAt)}</>}
                    {p.transactionRef && <> · Ref: {p.transactionRef}</>}
                  </div>
                </div>
                <div className="text-xs text-gray-400 font-mono">{p.paymentReference}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function methodLabel(m: string) {
  const map: Record<string, string> = {
    CASH: "เงินสด",
    BANK_TRANSFER: "โอนธนาคาร",
    PROMPTPAY: "พร้อมเพย์",
    PAYMENT_GATEWAY: "Payment Gateway",
    OTA: "OTA",
    OTHER: "อื่นๆ",
  };
  return map[m] ?? m;
}

function purposeLabel(p: string) {
  const map: Record<string, string> = {
    DEPOSIT: "มัดจำ",
    BALANCE: "ชำระส่วนที่เหลือ",
    FULL: "ชำระเต็มจำนวน",
    EXTRA_CHARGE: "ค่าใช้จ่ายเพิ่มเติม",
  };
  return map[p] ?? p;
}
