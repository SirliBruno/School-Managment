import { describe, it, expect } from "vitest";
import { getAttachmentSlotsForType, parseAttachments } from "../attachments";

describe("attachments utility", () => {
  describe("getAttachmentSlotsForType", () => {
    it("returns Faris and Medical slots for sick leaves", () => {
      const slots = getAttachmentSlotsForType("مرضي (تقرير طبي)");
      expect(slots).toHaveLength(2);
      expect(slots[0].id).toBe("faris");
      expect(slots[1].id).toBe("medical");
      expect(slots[0].required).toBe(true);
      expect(slots[1].required).toBe(true);
    });

    it("returns Faris slot only for emergency leave", () => {
      const slots = getAttachmentSlotsForType("اضطراري");
      expect(slots).toHaveLength(1);
      expect(slots[0].id).toBe("faris");
    });

    it("returns Faris and Medical slots for escort leave", () => {
      const slots = getAttachmentSlotsForType("مرافق مريض");
      expect(slots).toHaveLength(2);
      expect(slots[0].id).toBe("faris");
      expect(slots[1].id).toBe("medical");
    });

    it("returns Faris and other slots for custom/other leaves", () => {
      const slots = getAttachmentSlotsForType("أخرى");
      expect(slots).toHaveLength(2);
      expect(slots[0].id).toBe("faris");
      expect(slots[1].id).toBe("other");
    });
  });

  describe("parseAttachments", () => {
    it("handles undefined or empty string cleanly", () => {
      expect(parseAttachments(undefined)).toEqual([]);
      expect(parseAttachments("")).toEqual([]);
    });

    it("parses single legacy URL string", () => {
      const url = "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/file.pdf";
      const result = parseAttachments(url);
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe(url);
      expect(result[0].slotId).toBe("default");
    });

    it("parses JSON array of attachment objects", () => {
      const raw = JSON.stringify([
        { slotId: "faris", label: "مرفق فارس", url: "https://example.com/faris.pdf" },
        { slotId: "medical", label: "مرفق صحتي", url: "https://example.com/medical.jpg" },
      ]);
      const result = parseAttachments(raw);
      expect(result).toHaveLength(2);
      expect(result[0].slotId).toBe("faris");
      expect(result[1].slotId).toBe("medical");
    });

    it("parses JSON key-value map object", () => {
      const raw = JSON.stringify({
        faris: "https://example.com/faris.pdf",
        medical: "https://example.com/medical.png",
      });
      const result = parseAttachments(raw);
      expect(result).toHaveLength(2);
      expect(result.some((r) => r.slotId === "faris")).toBe(true);
      expect(result.some((r) => r.slotId === "medical")).toBe(true);
    });
  });
});
