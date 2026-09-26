/**
 * نظام حساب قرارات حسم ساعات ودقائق التأخر والخروج المبكر
 * وفق المادة (21) من لائحة الخدمة المدنية والقرارات الوزارية المعتمدة
 */

export interface DeductionCalculationResult {
  delayMinutes: number;
  totalHours: number;
  deductionDays: number;
  remainderMinutes: number;
  hoursFormatted: string;
}

/**
 * عدد الدقائق في يوم العمل المعتمد في الخدمة المدنية (7 ساعات عمل = 420 دقيقة)
 */
export const MINUTES_PER_WORK_DAY = 420;
export const MINUTES_PER_HOUR = 60;

/**
 * دالة حساب أيام الحسم بناءً على إجمالي دقائق التأخر والخروج المبكر
 * @param minutes إجمالي دقائق التأخر التراكمية
 */
export function calculateDeduction(minutes: number): DeductionCalculationResult {
  const safeMinutes = Math.max(0, Math.floor(Number(minutes) || 0));
  const totalHours = Math.round((safeMinutes / MINUTES_PER_HOUR) * 10) / 10;
  
  // كل 7 ساعات (420 دقيقة) تعادل حسم يوم عمل واحد
  const deductionDays = Math.floor(safeMinutes / MINUTES_PER_WORK_DAY);
  const remainderMinutes = safeMinutes % MINUTES_PER_WORK_DAY;

  return {
    delayMinutes: safeMinutes,
    totalHours,
    deductionDays,
    remainderMinutes,
    hoursFormatted: totalHours.toLocaleString("ar-SA"),
  };
}

export interface DeductionFormData {
  teacherId?: string;
  teacherName?: string;
  civilId?: string;
  specialization?: string;
  rank?: string;
  jobNumber?: string;
  currentAction?: string;
  delayMinutes?: number;
  totalHours?: number;
  deductionDays?: number;
  decisionNumber?: string;
  decisionDate?: string;
  principalName?: string;
}

export interface DeductionFormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * التحقق من صحة مدخلات قرار الحسم
 */
export function validateDeductionForm(data: DeductionFormData): DeductionFormValidation {
  const errors: Record<string, string> = {};

  if (!data.teacherId || !data.teacherName?.trim()) {
    errors.teacherId = "يجب اختيار المعلمة من القائمة.";
  }

  if (!data.civilId || !/^\d{10}$/.test(String(data.civilId).trim())) {
    errors.civilId = "رقم السجل المدني يجب أن يتكون من 10 أرقام.";
  }

  const minutes = Number(data.delayMinutes);
  if (isNaN(minutes) || minutes < 0) {
    errors.delayMinutes = "دقائق التأخر يجب أن تكون رقماً موجباً.";
  }

  const hours = Number(data.totalHours);
  if (isNaN(hours) || hours <= 0) {
    errors.totalHours = "يجب تحديد ساعات التأخر بحيث تكون أكبر من الصفر.";
  }

  const days = Number(data.deductionDays);
  if (isNaN(days) || days <= 0) {
    errors.deductionDays = "أيام الحسم المقررة يجب أن تكون يوماً واحداً على الأقل.";
  }

  if (!data.decisionNumber?.trim()) {
    errors.decisionNumber = "رقم القرار مطلوب.";
  }

  if (!data.decisionDate?.trim()) {
    errors.decisionDate = "تاريخ القرار مطلوب.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
