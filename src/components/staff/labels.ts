/** ป้ายภาษาไทยสำหรับค่า enum ที่ผู้ใช้เห็น — ห้ามโชว์รหัสอังกฤษบนหน้าจอ */

export const ENCOUNTER_STATUS: Record<string, string> = {
  WAITING: "รอตรวจ",
  IN_PROGRESS: "กำลังตรวจ",
  PENDING_RESULT: "รอผล",
  READY_TO_BILL: "รอชำระเงิน",
  CLOSED: "ปิดเคส",
  CANCELLED: "ยกเลิก",
};

export const ENCOUNTER_TYPE: Record<string, string> = {
  OPD: "ตรวจทั่วไป",
  EMERGENCY: "ฉุกเฉิน",
  VACCINE: "วัคซีน",
  RECHECK: "ตรวจซ้ำ",
  SURGERY: "ผ่าตัด",
};

export const BOOKING_STATUS: Record<string, string> = {
  REQUESTED: "รออนุมัติ",
  CONFIRMED: "ยืนยันแล้ว",
  CHECKED_IN: "มาถึงแล้ว",
  COMPLETED: "เสร็จ",
  CANCELLED: "ยกเลิก",
  NO_SHOW: "ไม่มา",
};

export const BOOKING_TYPE: Record<string, string> = {
  CONSULT: "ตรวจรักษา",
  VACCINE: "วัคซีน",
  GROOMING: "อาบน้ำตัดขน",
  FOLLOW_UP: "ติดตามผล",
  BOARDING: "ฝากเลี้ยง",
  SURGERY: "ผ่าตัด",
  OTHER: "อื่น ๆ",
};

export const CREDIT_REASON: Record<string, string> = {
  PRICE_ERROR: "ราคาหรือจำนวนสูงไป",
  SERVICE_NOT_RENDERED: "บริการไม่ได้ทำให้",
  RETURN: "รับคืนสินค้า",
  DISCOUNT_AFTER: "ส่วนลดภายหลัง",
};

export const GROOMING_STATUS: Record<string, string> = {
  SCHEDULED: "นัดไว้",
  CHECKED_IN: "รับแล้ว",
  IN_PROGRESS: "กำลังอาบ/ตัด",
  DRYING: "เป่าแห้ง",
  READY_FOR_PICKUP: "รอรับ",
  COMPLETED: "ส่งมอบแล้ว",
  CANCELLED: "ยกเลิก",
  NO_SHOW: "ไม่มา",
};

export const STAY_STATUS: Record<string, string> = {
  RESERVED: "จองกรง",
  CHECKED_IN: "เข้าพัก",
  CHECKED_OUT: "เช็คเอาท์",
  CANCELLED: "ยกเลิก",
};

export const KENNEL_SIZE: Record<string, string> = {
  SMALL: "เล็ก",
  MEDIUM: "กลาง",
  LARGE: "ใหญ่",
  CAT_CONDO: "คอนโดแมว",
};

export const CARE_LOG: Record<string, string> = {
  FEED: "ให้อาหาร",
  WATER: "ให้น้ำ",
  WALK: "พาเดิน",
  OBSERVATION: "บันทึกอาการ",
  MEDICATION: "ให้ยา",
  PLAY: "เล่น",
  LITTER: "ทำความสะอาด",
};

export const RX_STATUS: Record<string, string> = {
  DRAFT: "ร่าง",
  ACTIVE: "รอจ่าย",
  PARTIALLY_DISPENSED: "จ่ายบางส่วน",
  DISPENSED: "จ่ายครบ",
  COMPLETED: "เสร็จ",
  CANCELLED: "ยกเลิก",
};

export const ORDER_STATUS: Record<string, string> = {
  ORDERED: "สั่งแล้ว",
  IN_PROGRESS: "กำลังทำ",
  COMPLETED: "ทำเสร็จ",
  CANCELLED: "ยกเลิก",
};

export const CHARGE_STATUS: Record<string, string> = {
  OPEN: "ยังไม่วางบิล",
  INVOICED: "วางบิลแล้ว",
  VOID: "ยกเลิก",
};

export const PAYMENT_METHOD: Record<string, string> = {
  CASH: "เงินสด",
  PROMPTPAY: "พร้อมเพย์",
  CREDIT_CARD: "บัตร",
  TRANSFER: "โอน",
};

export const INVOICE_STATUS: Record<string, string> = {
  DRAFT: "ร่าง",
  ISSUED: "ออกแล้ว",
  PARTIALLY_PAID: "ชำระบางส่วน",
  PAID: "ชำระแล้ว",
  VOID: "ยกเลิก",
};

export const PET_SEX: Record<string, string> = {
  MALE: "ผู้",
  FEMALE: "เมีย",
  UNKNOWN: "ไม่ระบุ",
};

export function labelOf(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}

export function waitMinutes(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}
