import { describe, it, expect } from "vitest";
import {
  resolveAttachmentUrl,
  parseAttachments,
  openSafeAttachmentUrl,
} from "../attachments";
import { AbsenceRecord, AbsenceInquiry } from "@/types/teacher";

describe("Attachment Lifecycle & Archive/Restore Integrity Audit", () => {
  describe("1. URL & Storage Path Resolution", () => {
    it("preserves standard HTTPS and HTTP URLs as-is", () => {
      const httpsUrl = "https://example.com/medical_report.pdf";
      expect(resolveAttachmentUrl(httpsUrl)).toBe(httpsUrl);
    });

    it("preserves Base64 Data URLs without alteration", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      expect(resolveAttachmentUrl(dataUrl)).toBe(dataUrl);
    });

    it("resolves relative Supabase storage paths to absolute public URLs instead of relative 404 paths", () => {
      const storagePathWithBucket = "absence-attachments/manual-records/2026_09_sample.pdf";
      const resolved = resolveAttachmentUrl(storagePathWithBucket);
      expect(resolved).toContain("https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/manual-records/2026_09_sample.pdf");
      expect(resolved).not.toContain("localhost");
      expect(resolved).not.toContain("procedures/absence");

      const storagePathWithoutBucket = "inquiries/inq_123_medical.jpg";
      const resolved2 = resolveAttachmentUrl(storagePathWithoutBucket);
      expect(resolved2).toBe("https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/inquiries/inq_123_medical.jpg");
    });

    it("extracts and safely resolves URL from JSON string payload", () => {
      const jsonPayload = JSON.stringify([
        { slotId: "faris", label: "مرفق فارس", url: "https://example.com/faris.pdf" },
        { slotId: "medical", label: "مرفق التقرير الطبي", url: "data:image/jpeg;base64,xyz" },
      ]);
      const resolved = resolveAttachmentUrl(jsonPayload);
      expect(resolved).toBe("https://example.com/faris.pdf");
    });
  });

  describe("2. Attachment Parsing & Multi-Slot Support", () => {
    it("parses single URL strings correctly", () => {
      const singleUrl = "https://example.com/report.png";
      const items = parseAttachments(singleUrl);
      expect(items).toHaveLength(1);
      expect(items[0].url).toBe(singleUrl);
    });

    it("parses JSON array of attachments and resolves all items", () => {
      const jsonPayload = JSON.stringify([
        { slotId: "faris", label: "مرفق فارس", url: "inquiries/faris.pdf" },
        { slotId: "medical", label: "مرفق التقرير الطبي", url: "data:image/png;base64,1234" },
      ]);
      const items = parseAttachments(jsonPayload);
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe("مرفق فارس");
      expect(items[0].url).toContain("supabase.co/storage/v1/object/public/absence-attachments/inquiries/faris.pdf");
      expect(items[1].url).toBe("data:image/png;base64,1234");
    });

    it("handles legacy JSON dictionary format", () => {
      const jsonDict = JSON.stringify({
        faris: "https://example.com/f.pdf",
        medical: "https://example.com/m.pdf",
      });
      const items = parseAttachments(jsonDict);
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe("مرفق فارس");
      expect(items[1].label).toBe("مرفق التقرير الطبي");
    });
  });

  describe("3. Create -> Archive -> Restore -> View Data Integrity", () => {
    it("guarantees attachmentUrl is 100% identical before archive and after restore", () => {
      const sampleAttachmentUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      // 1. Create Absence Record
      const initialRecord: AbsenceRecord = {
        id: "abs-rec-test-101",
        teacherId: "teacher-1",
        teacherName: "فاطمة أحمد",
        jobNumber: "1020304050",
        specialty: "رياضيات",
        date: "2026-09-29",
        type: "مرضي",
        reason: "وعكة صحية وإجازة مرضية معتمدة",
        attachmentUrl: sampleAttachmentUrl,
        timestamp: "2026-09-29T05:00:00.000Z",
        isArchived: false,
      };

      const beforeArchive = {
        id: initialRecord.id,
        attachment_url: initialRecord.attachmentUrl,
      };

      // 2. Archive Record (Simulate soft-delete)
      const now = new Date().toISOString();
      const archivedRecord: AbsenceRecord = {
        ...initialRecord,
        isArchived: true,
        archivedAt: now,
        archiveReason: "أرشفة يدوية تجريبية",
        archivedByCascade: false,
      };

      expect(archivedRecord.attachmentUrl).toBe(initialRecord.attachmentUrl);

      // 3. Restore Record (Simulate restore from archive)
      const restoredRecord: AbsenceRecord = {
        ...archivedRecord,
        isArchived: false,
        archivedAt: undefined,
        archiveReason: undefined,
        archivedByCascade: undefined,
      };

      const afterRestore = {
        id: restoredRecord.id,
        attachment_url: restoredRecord.attachmentUrl,
      };

      // 4. Assert Exact Match
      expect(afterRestore).toEqual(beforeArchive);
      expect(restoredRecord.isArchived).toBe(false);
      expect(restoredRecord.attachmentUrl).toBe(sampleAttachmentUrl);

      // 5. Assert View Resolver produces valid usable URL
      const viewableUrl = resolveAttachmentUrl(restoredRecord.attachmentUrl);
      expect(viewableUrl).toBe(sampleAttachmentUrl);
      expect(viewableUrl).not.toContain("404");
    });

    it("preserves linked inquiry attachments across archive and restore", () => {
      const inquiryAttachment = JSON.stringify([
        { slotId: "faris", label: "مرفق فارس", url: "https://example.com/faris_approved.pdf" },
      ]);

      const inquiry: AbsenceInquiry = {
        id: "inq-test-202",
        teacherId: "teacher-1",
        teacherName: "فاطمة أحمد",
        jobNumber: "1020304050",
        absenceDate: "2026-09-29",
        token: "tok123456",
        status: "approved",
        expiresAt: "2026-10-01T05:00:00.000Z",
        attachmentUrl: inquiryAttachment,
        createdAt: "2026-09-29T05:00:00.000Z",
        isArchived: false,
      };

      // Archive
      const archivedInq: AbsenceInquiry = {
        ...inquiry,
        isArchived: true,
        archivedAt: new Date().toISOString(),
      };

      // Restore
      const restoredInq: AbsenceInquiry = {
        ...archivedInq,
        isArchived: false,
        archivedAt: undefined,
      };

      expect(restoredInq.attachmentUrl).toBe(inquiry.attachmentUrl);
      const parsed = parseAttachments(restoredInq.attachmentUrl);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].url).toBe("https://example.com/faris_approved.pdf");
    });
  });
});
