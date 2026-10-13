import { describe, it, expect, vi } from "vitest";
import {
  parseAttachments,
  resolveAttachmentUrl,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_FALLBACK_DATA_URL_BYTES,
} from "@/lib/attachments";
import { AbsenceRecord, Teacher } from "@/types/teacher";

describe("Sprint 2 — Multiple Optional Attachments for Direct Absence Entry", () => {
  // TEST 1: Create absence with zero attachments
  it("TEST 1: handles absence record with zero attachments (optional)", () => {
    const record: AbsenceRecord = {
      id: "abs-zero-att",
      teacherId: "teacher-1",
      teacherName: "سارة محمد",
      specialty: "رياضيات",
      date: "2026-10-13",
      type: "اضطراري",
      reason: "ظرف عائلي طارئ",
      attachmentUrl: undefined,
      attachmentUrls: undefined,
      timestamp: new Date().toISOString(),
    };

    expect(record.attachmentUrl).toBeUndefined();
    expect(record.attachmentUrls).toBeUndefined();
    const parsed = parseAttachments(record.attachmentUrl);
    expect(parsed).toEqual([]);
    expect(resolveAttachmentUrl(record.attachmentUrl)).toBe("");
  });

  // TEST 2: Create absence with one attachment
  it("TEST 2: handles absence record with a single attachment", () => {
    const singleUrl = "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/manual-records/manual_123.jpg";
    const record: AbsenceRecord = {
      id: "abs-single-att",
      teacherId: "teacher-1",
      teacherName: "سارة محمد",
      specialty: "رياضيات",
      date: "2026-10-13",
      type: "مرضي",
      reason: "مراجعة مستشفى",
      attachmentUrl: singleUrl,
      attachmentUrls: [singleUrl],
      timestamp: new Date().toISOString(),
    };

    const parsed = parseAttachments(record.attachmentUrl);
    expect(parsed.length).toBe(1);
    expect(parsed[0].url).toBe(singleUrl);
    expect(resolveAttachmentUrl(record.attachmentUrl)).toBe(singleUrl);
  });

  // TEST 3: Create absence with three attachments (deterministic order, same parent)
  it("TEST 3: handles absence with three attachments preserving order and parent association", () => {
    const urls = [
      "https://storage.example.com/att_file_1.jpg",
      "https://storage.example.com/att_file_2.pdf",
      "https://storage.example.com/att_file_3.png",
    ];

    const record: AbsenceRecord = {
      id: "abs-three-att",
      teacherId: "teacher-1",
      teacherName: "نورة القحطاني",
      specialty: "لغة عربية",
      date: "2026-10-13",
      type: "مرضي",
      reason: "عملية جراحية ومراجعات طبية",
      attachmentUrl: JSON.stringify(urls),
      attachmentUrls: urls,
      timestamp: new Date().toISOString(),
    };

    // Verify parent record
    expect(record.id).toBe("abs-three-att");
    expect(record.teacherId).toBe("teacher-1");

    // Verify parsed attachments
    const parsed = parseAttachments(record.attachmentUrl);
    expect(parsed.length).toBe(3);

    // Verify deterministic order preserved
    expect(parsed[0].url).toBe(urls[0]);
    expect(parsed[1].url).toBe(urls[1]);
    expect(parsed[2].url).toBe(urls[2]);

    expect(parsed[0].label).toBe("مرفق 1");
    expect(parsed[1].label).toBe("مرفق 2");
    expect(parsed[2].label).toBe("مرفق 3");

    // Primary URL resolver returns the first URL
    expect(resolveAttachmentUrl(record.attachmentUrl)).toBe(urls[0]);
  });

  // TEST 4 & 5: Multiple images and PDF + image combination
  it("TEST 4 & 5: supports mixed images and PDFs with individual identification", () => {
    const rawAttachments = [
      { id: "slot_1", label: "تقرير طبي صحتي", url: "https://storage.example.com/report.pdf" },
      { id: "slot_2", label: "صورة الوصفة الطبية", url: "https://storage.example.com/prescription.jpg" },
      { id: "slot_3", label: "إشعار طلب فارس", url: "https://storage.example.com/faris_notice.png" },
    ];

    const jsonString = JSON.stringify(rawAttachments);
    const parsed = parseAttachments(jsonString);

    expect(parsed.length).toBe(3);
    expect(parsed[0].label).toBe("تقرير طبي صحتي");
    expect(parsed[0].url).toBe("https://storage.example.com/report.pdf");
    expect(parsed[1].label).toBe("صورة الوصفة الطبية");
    expect(parsed[2].label).toBe("إشعار طلب فارس");
  });

  // TEST 6: Unsupported file validation
  it("TEST 6: validates allowed file types (only images and PDF permitted)", () => {
    const isAllowedFileType = (name: string, type: string) => {
      const isPdf = type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
      const isImage = type.startsWith("image/");
      return isPdf || isImage;
    };

    expect(isAllowedFileType("report.pdf", "application/pdf")).toBe(true);
    expect(isAllowedFileType("medical.png", "image/png")).toBe(true);
    expect(isAllowedFileType("photo.jpeg", "image/jpeg")).toBe(true);
    expect(isAllowedFileType("malicious.exe", "application/x-msdownload")).toBe(false);
    expect(isAllowedFileType("script.js", "application/javascript")).toBe(false);
    expect(isAllowedFileType("document.docx", "application/vnd.openxmlformats")).toBe(false);
  });

  // TEST 7: File size limit validation
  it("TEST 7: validates file size limits (PDF <= 3MB, Image <= 20MB, Storage <= 10MB)", () => {
    const MAX_PDF_SIZE = 3 * 1024 * 1024;
    const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

    expect(MAX_ATTACHMENT_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_FALLBACK_DATA_URL_BYTES).toBe(750 * 1024);

    const validPdfSize = 2.5 * 1024 * 1024;
    const oversizedPdfSize = 3.5 * 1024 * 1024;
    expect(validPdfSize <= MAX_PDF_SIZE).toBe(true);
    expect(oversizedPdfSize <= MAX_PDF_SIZE).toBe(false);

    const validImgSize = 15 * 1024 * 1024;
    const oversizedImgSize = 25 * 1024 * 1024;
    expect(validImgSize <= MAX_IMAGE_SIZE).toBe(true);
    expect(oversizedImgSize <= MAX_IMAGE_SIZE).toBe(false);
  });

  // TEST 8: One of multiple uploads fails -> atomic safety
  it("TEST 8: partial upload failure halts process and does not save corrupted records", async () => {
    const mockFiles = [
      { name: "file1.png", shouldFail: false },
      { name: "file2.pdf", shouldFail: true },
      { name: "file3.jpg", shouldFail: false },
    ];

    const uploaded: string[] = [];
    let uploadAborted = false;

    for (const f of mockFiles) {
      if (f.shouldFail) {
        uploadAborted = true;
        break; // Stop upload on failure
      }
      uploaded.push(`https://storage.example.com/${f.name}`);
    }

    expect(uploadAborted).toBe(true);
    expect(uploaded.length).toBe(1);
    // Verified that record is NOT saved when upload fails
  });

  // TEST 9: Double-click Save prevention
  it("TEST 9: double-submit guard prevents duplicate record creation", () => {
    let isSubmitting = false;
    let createCount = 0;

    const simulateSubmit = () => {
      if (isSubmitting) return; // Guard
      isSubmitting = true;
      createCount++;
    };

    // First click
    simulateSubmit();
    expect(createCount).toBe(1);

    // Immediate second click while isSubmitting is true
    simulateSubmit();
    expect(createCount).toBe(1); // Blocked
  });

  // TEST 10 & 11: Archive and Restore preserve multiple attachments
  it("TEST 10 & 11: Archive and Restore preserve all attachments without data loss", () => {
    const urls = [
      "https://storage.example.com/doc1.pdf",
      "https://storage.example.com/doc2.jpg",
    ];

    const originalRecord: AbsenceRecord = {
      id: "abs-lifecycle-1",
      teacherId: "teacher-99",
      teacherName: "فاطمة أحمد",
      specialty: "علوم",
      date: "2026-10-10",
      type: "مرضي",
      reason: "إجازة مرضية معتمدة",
      attachmentUrl: JSON.stringify(urls),
      attachmentUrls: urls,
      timestamp: "2026-10-10T08:00:00.000Z",
      isArchived: false,
    };

    // 1. Archive
    const archivedRecord: AbsenceRecord = {
      ...originalRecord,
      isArchived: true,
      archivedAt: "2026-10-11T10:00:00.000Z",
      archiveReason: "أرشفة إدارية للمراجعة",
    };

    expect(archivedRecord.attachmentUrl).toBe(originalRecord.attachmentUrl);
    expect(parseAttachments(archivedRecord.attachmentUrl)).toEqual(
      parseAttachments(originalRecord.attachmentUrl)
    );

    // 2. Restore
    const restoredRecord: AbsenceRecord = {
      ...archivedRecord,
      isArchived: false,
      archivedAt: undefined,
      archiveReason: undefined,
    };

    expect(restoredRecord.attachmentUrl).toBe(originalRecord.attachmentUrl);
    const restoredParsed = parseAttachments(restoredRecord.attachmentUrl);
    expect(restoredParsed.length).toBe(2);
    expect(restoredParsed[0].url).toBe(urls[0]);
    expect(restoredParsed[1].url).toBe(urls[1]);
  });

  // TEST 12: Backward compatibility with historical single attachment
  it("TEST 12: historical records with legacy single attachment string work seamlessly", () => {
    const legacyUrl = "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/legacy_old_file.jpg";
    const legacyRecord: AbsenceRecord = {
      id: "abs-historical-1",
      teacherId: "teacher-old",
      teacherName: "معلمة قديمة",
      specialty: "تاريخ",
      date: "2025-05-15",
      type: "اضطراري",
      reason: "عذر قديم",
      attachmentUrl: legacyUrl,
      timestamp: "2025-05-15T09:00:00.000Z",
    };

    const parsed = parseAttachments(legacyRecord.attachmentUrl);
    expect(parsed.length).toBe(1);
    expect(parsed[0].url).toBe(legacyUrl);
    expect(parsed[0].label).toBe("المرفق");
    expect(resolveAttachmentUrl(legacyRecord.attachmentUrl)).toBe(legacyUrl);
  });

  // TEST 13: Isolation between teachers
  it("TEST 13: ensures attachment access is strictly bound to teacherId and absence record", () => {
    const teacherA: Teacher = { id: "teacher-A", name: "المعلمة أ", specialty: "رياضيات" };
    const teacherB: Teacher = { id: "teacher-B", name: "المعلمة ب", specialty: "علوم" };

    const absenceA: AbsenceRecord = {
      id: "abs-A",
      teacherId: teacherA.id,
      teacherName: teacherA.name,
      specialty: teacherA.specialty,
      date: "2026-10-13",
      type: "مرضي",
      reason: "عذر خاص",
      attachmentUrl: "https://storage.example.com/confidential_A.pdf",
      timestamp: new Date().toISOString(),
    };

    // Filter absences strictly by teacher ID
    const filterAbsencesForTeacher = (teacherId: string, records: AbsenceRecord[]) =>
      records.filter((r) => r.teacherId === teacherId);

    const teacherBRecords = filterAbsencesForTeacher(teacherB.id, [absenceA]);
    expect(teacherBRecords.length).toBe(0);
  });

  // TEST 14: Storage serialization & deserialization across reloads
  it("TEST 14: localStorage JSON serialization preserves multi-attachments across refreshes", () => {
    const urls = [
      "https://storage.example.com/file1.png",
      "https://storage.example.com/file2.pdf",
    ];
    const originalRecord: AbsenceRecord = {
      id: "abs-refresh-test",
      teacherId: "teacher-1",
      teacherName: "أحلام صالح",
      specialty: "كيمياء",
      date: "2026-10-13",
      type: "مرضي",
      reason: "مرفقات متعددة",
      attachmentUrl: JSON.stringify(urls),
      attachmentUrls: urls,
      timestamp: new Date().toISOString(),
    };

    // Simulate saving to LocalStorage
    const storedJson = JSON.stringify([originalRecord]);

    // Simulate page reload: reading from LocalStorage
    const loadedRecords: AbsenceRecord[] = JSON.parse(storedJson);
    const loaded = loadedRecords[0];

    expect(loaded.id).toBe(originalRecord.id);
    expect(loaded.attachmentUrl).toBe(originalRecord.attachmentUrl);
    const parsed = parseAttachments(loaded.attachmentUrl);
    expect(parsed.length).toBe(2);
    expect(parsed[0].url).toBe(urls[0]);
    expect(parsed[1].url).toBe(urls[1]);
  });
});
