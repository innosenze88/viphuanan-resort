export default function AdminIntegrationsPage() {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <div className="font-semibold mb-1">Integration ยังอยู่ระหว่างการพัฒนา</div>
        <div className="text-xs">
          การเชื่อมต่อ Booking.com, Agoda, LINE Notify, PromptPay Webhook จะพร้อมใช้งานในเวอร์ชันถัดไป
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            name: "Booking.com",
            logo: "🏨",
            description: "ซิงค์การจองจาก OTA โดยอัตโนมัติ",
            status: "planned",
          },
          {
            name: "Agoda",
            logo: "🌐",
            description: "ซิงค์ราคาและความพร้อมของห้องพัก",
            status: "planned",
          },
          {
            name: "LINE Notify",
            logo: "💬",
            description: "แจ้งเตือนการจองและการชำระเงินผ่าน LINE",
            status: "planned",
          },
          {
            name: "PromptPay Webhook",
            logo: "💳",
            description: "รับการแจ้งเตือนการชำระเงิน PromptPay อัตโนมัติ",
            status: "planned",
          },
          {
            name: "กรมการปกครอง (TM30)",
            logo: "🏛️",
            description: "ส่งรายงาน TM30 อัตโนมัติ",
            status: "planned",
          },
          {
            name: "ระบบบัญชีภาษี",
            logo: "📊",
            description: "ส่งออกข้อมูลภาษีไปยังซอฟต์แวร์บัญชี",
            status: "planned",
          },
        ].map((integration) => (
          <div
            key={integration.name}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 opacity-60"
          >
            <div className="text-2xl">{integration.logo}</div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">{integration.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{integration.description}</div>
              <div className="mt-2">
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  กำลังพัฒนา
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
