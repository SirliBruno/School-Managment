import { describe, it, expect } from "vitest";
import {
  calculateDeduction,
  validateDeductionForm,
  MINUTES_PER_WORK_DAY,
  MINUTES_PER_HOUR,
} from "../deductionCalculator";
import {
  buildDeductionDecisionHtml,
  DeductionDecisionPdfData,
} from "../printDeductionDecisionPdfService";

describe("Deduction Calculator & Form 19 Suite", () => {
  describe("calculateDeduction", () => {
    it("should calculate 0 days for 0 minutes", () => {
      const res = calculateDeduction(0);
      expect(res.delayMinutes).toBe(0);
      expect(res.totalHours).toBe(0);
      expect(res.deductionDays).toBe(0);
      expect(res.remainderMinutes).toBe(0);
    });

    it("should calculate 1 deduction day for exactly 420 minutes (7 hours of civil service workday)", () => {
      const res = calculateDeduction(MINUTES_PER_WORK_DAY);
      expect(res.delayMinutes).toBe(420);
      expect(res.totalHours).toBe(7);
      expect(res.deductionDays).toBe(1);
      expect(res.remainderMinutes).toBe(0);
    });

    it("should calculate 2 deduction days for 840 minutes (14 hours)", () => {
      const res = calculateDeduction(840);
      expect(res.delayMinutes).toBe(840);
      expect(res.totalHours).toBe(14);
      expect(res.deductionDays).toBe(2);
      expect(res.remainderMinutes).toBe(0);
    });

    it("should calculate 3 deduction days for 1260 minutes (21 hours)", () => {
      const res = calculateDeduction(1260);
      expect(res.delayMinutes).toBe(1260);
      expect(res.totalHours).toBe(21);
      expect(res.deductionDays).toBe(3);
      expect(res.remainderMinutes).toBe(0);
    });

    it("should handle partial excess minutes and compute correct remainder", () => {
      // 500 minutes = 420 (1 day) + 80 remainder
      const res = calculateDeduction(500);
      expect(res.deductionDays).toBe(1);
      expect(res.remainderMinutes).toBe(80);
      expect(res.totalHours).toBe(8.3);
    });

    it("should safely sanitize negative or malformed inputs to 0", () => {
      const resNegative = calculateDeduction(-100);
      expect(resNegative.delayMinutes).toBe(0);
      expect(resNegative.deductionDays).toBe(0);

      const resNaN = calculateDeduction(Number("not-a-number"));
      expect(resNaN.delayMinutes).toBe(0);
      expect(resNaN.deductionDays).toBe(0);
    });
  });

  describe("validateDeductionForm", () => {
    it("should validate complete and correct form data", () => {
      const validData = {
        teacherId: "teacher-uuid-1",
        teacherName: "سارة محمد أحمد",
        civilId: "1098765432",
        delayMinutes: 420,
        totalHours: 7,
        deductionDays: 1,
        decisionNumber: "١٩/٤٥/١٠١",
        decisionDate: "١٤٤٥/٠٨/١٥هـ",
        principalName: "قائدة المدرسة",
      };

      const result = validateDeductionForm(validData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it("should reject when teacher is missing", () => {
      const data = {
        civilId: "1098765432",
        totalHours: 7,
        deductionDays: 1,
        decisionNumber: "١٩/٤٥",
        decisionDate: "١٤٤٥/٠٨/١٥هـ",
      };

      const result = validateDeductionForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.teacherId).toBeDefined();
    });

    it("should reject invalid civil ID that is not exactly 10 digits", () => {
      const data = {
        teacherId: "t-1",
        teacherName: "نورة علي",
        civilId: "12345", // too short
        totalHours: 7,
        deductionDays: 1,
        decisionNumber: "١٩/٤٥",
        decisionDate: "١٤٤٥/٠٨/١٥هـ",
      };

      const result = validateDeductionForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.civilId).toBeDefined();
    });

    it("should reject when deduction days or hours are 0 or negative", () => {
      const data = {
        teacherId: "t-1",
        teacherName: "نورة علي",
        civilId: "1098765432",
        totalHours: 0,
        deductionDays: 0,
        decisionNumber: "١٩/٤٥",
        decisionDate: "١٤٤٥/٠٨/١٥هـ",
      };

      const result = validateDeductionForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.totalHours).toBeDefined();
      expect(result.errors.deductionDays).toBeDefined();
    });

    it("should reject when decision number or date are blank", () => {
      const data = {
        teacherId: "t-1",
        teacherName: "نورة علي",
        civilId: "1098765432",
        totalHours: 7,
        deductionDays: 1,
        decisionNumber: "   ",
        decisionDate: "",
      };

      const result = validateDeductionForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.decisionNumber).toBeDefined();
      expect(result.errors.decisionDate).toBeDefined();
    });
  });

  describe("buildDeductionDecisionHtml (Form 19 Compliance)", () => {
    const mockPdfData: DeductionDecisionPdfData = {
      teacherName: "هدى سالم القحطاني",
      civilId: "1087654321",
      specialization: "رياضيات",
      rank: "معلم ممارس",
      jobNumber: "1087654321",
      currentAction: "معلمة",
      schoolName: "مدرسة الثانوية الخامسة مسارات",
      principalName: "فاطمة محمد الحربي",
      delayHours: 7,
      deductionDays: 1,
      decisionNumber: "١٩/٤٥/٥٠",
      decisionDate: "١٤٤٥/٠٨/٢٠هـ",
    };

    it("should generate valid HTML containing official Form 19 titles and model code", () => {
      const html = buildDeductionDecisionHtml(mockPdfData);

      expect(html).toContain("نموذج رقم ( ١٩ )");
      expect(html).toContain("قرار حسم مجموع ساعات تأخر وخروج مبكر");
      expect(html).toContain("( و.م.ع.ن - ٠٢ - ٠٣ )");
    });

    it("should include official legal references: Article 21 and Ministerial Decision 1/1139", () => {
      const html = buildDeductionDecisionHtml(mockPdfData);

      // Article 21
      expect(html).toContain("المادة ( <strong>٢١</strong> ) من نظام الخدمة المدنية");
      // Ministerial Decision
      expect(html).toContain("القرار رقم <strong>١/١١٣٩</strong> وتاريخ <strong>١٤٢١/٣/١٧هـ</strong>");
    });

    it("should correctly embed teacher details, delay hours, and deduction days", () => {
      const html = buildDeductionDecisionHtml(mockPdfData);

      expect(html).toContain("هدى سالم القحطاني");
      expect(html).toContain("1087654321");
      expect(html).toContain("رياضيات");
      expect(html).toContain("مدرسة الثانوية الخامسة مسارات");
      expect(html).toContain("فاطمة محمد الحربي");
      expect(html).toContain("١٩/٤٥/٥٠");
      expect(html).toContain("١٤٤٥/٠٨/٢٠هـ");
      expect(html).toContain(">7<"); // delay hours
      expect(html).toContain(">1<"); // deduction days
    });

    it("should contain distribution list (صور لمن يهمه الأمر)", () => {
      const html = buildDeductionDecisionHtml(mockPdfData);

      expect(html).toContain("صورة / للموظفات لمتابعة تنفيذ الحسم");
      expect(html).toContain("صورة / لمكتب التعليم");
      expect(html).toContain("صورة / لملفها بالمدرسة");
    });

    it("should sanitize and escape HTML characters in teacher inputs to prevent XSS", () => {
      const dangerousData: DeductionDecisionPdfData = {
        ...mockPdfData,
        teacherName: "<script>alert('xss')</script>منال",
      };

      const html = buildDeductionDecisionHtml(dangerousData);
      expect(html).not.toContain("<script>alert('xss')</script>");
      expect(html).toContain("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;منال");
    });
  });
});
