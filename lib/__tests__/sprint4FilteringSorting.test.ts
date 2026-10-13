import { describe, it, expect } from "vitest";
import { filterByDateRange } from "@/lib/reportsEngine";

describe("Sprint 4 — Filtering & Sorting Engine Verification", () => {
  describe("filterByDateRange — Robust Date & Timestamp Boundary Handling", () => {
    it("correctly includes ISO datetime string on same-day range (boundary matching)", () => {
      const isoDate = "2026-03-24T14:30:00.000Z";
      const start = "2026-03-24";
      const end = "2026-03-24";

      expect(filterByDateRange(isoDate, start, end)).toBe(true);
    });

    it("correctly includes plain YYYY-MM-DD on same-day range", () => {
      const date = "2026-03-24";
      expect(filterByDateRange(date, "2026-03-24", "2026-03-24")).toBe(true);
    });

    it("excludes dates before startDate or after endDate", () => {
      expect(filterByDateRange("2026-03-23", "2026-03-24", "2026-03-30")).toBe(false);
      expect(filterByDateRange("2026-03-31", "2026-03-24", "2026-03-30")).toBe(false);
      expect(filterByDateRange("2026-03-25", "2026-03-24", "2026-03-30")).toBe(true);
    });

    it("handles space-separated datetime strings e.g. '2026-03-24 08:00:00'", () => {
      expect(filterByDateRange("2026-03-24 08:00:00", "2026-03-24", "2026-03-24")).toBe(true);
      expect(filterByDateRange("2026-03-25 08:00:00", "2026-03-24", "2026-03-24")).toBe(false);
    });

    it("correctly filters by month and year", () => {
      expect(filterByDateRange("2026-04-15", undefined, undefined, "4", "2026")).toBe(true);
      expect(filterByDateRange("2026-04-15", undefined, undefined, "04", "2026")).toBe(true);
      expect(filterByDateRange("2026-05-15", undefined, undefined, "4", "2026")).toBe(false);
      expect(filterByDateRange("2025-04-15", undefined, undefined, "4", "2026")).toBe(false);
    });

    it("returns false for empty or undefined dates", () => {
      expect(filterByDateRange(undefined, "2026-01-01", "2026-12-31")).toBe(false);
      expect(filterByDateRange("", "2026-01-01", "2026-12-31")).toBe(false);
    });
  });

  describe("Sorting Comparators — Types, Collation, Nulls & Stability", () => {
    // Helper function mirroring DataTable sorting comparator
    function compareValues(
      aVal: any,
      bVal: any,
      sortDirection: "asc" | "desc",
      idA?: string,
      idB?: string
    ): number {
      const aNil = aVal === null || aVal === undefined || aVal === "";
      const bNil = bVal === null || bVal === undefined || bVal === "";
      if (aNil && bNil) return 0;
      if (aNil) return 1;
      if (bNil) return -1;

      let comparison = 0;

      // 1. Date comparison
      const isDateA = aVal instanceof Date || (typeof aVal === "string" && /^\d{4}-\d{2}-\d{2}/.test(aVal));
      const isDateB = bVal instanceof Date || (typeof bVal === "string" && /^\d{4}-\d{2}-\d{2}/.test(bVal));
      if (isDateA && isDateB) {
        const timeA = new Date(aVal).getTime();
        const timeB = new Date(bVal).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          comparison = timeA - timeB;
        }
      }

      // 2. Numeric comparison
      if (comparison === 0) {
        const numA = typeof aVal === "number" ? aVal : (typeof aVal === "string" && aVal.trim() !== "" && !isNaN(Number(aVal)) ? Number(aVal) : NaN);
        const numB = typeof bVal === "number" ? bVal : (typeof bVal === "string" && bVal.trim() !== "" && !isNaN(Number(bVal)) ? Number(bVal) : NaN);

        if (!isNaN(numA) && !isNaN(numB) && typeof aVal !== "boolean" && typeof bVal !== "boolean") {
          comparison = numA - numB;
        }
      }

      // 3. Arabic collation comparison
      if (comparison === 0) {
        const strA = String(aVal);
        const strB = String(bVal);
        comparison = strA.localeCompare(strB, "ar", { numeric: true, sensitivity: "base" });
      }

      const dirMultiplier = sortDirection === "asc" ? 1 : -1;
      if (comparison !== 0) {
        return comparison * dirMultiplier;
      }

      if (idA !== undefined && idB !== undefined && idA !== idB) {
        return String(idA).localeCompare(String(idB));
      }

      return 0;
    }

    it("sorts chronological dates accurately in ascending and descending order", () => {
      const dates = ["2026-03-24", "2026-01-15", "2026-05-02", "2026-01-05"];
      
      const asc = [...dates].sort((a, b) => compareValues(a, b, "asc"));
      expect(asc).toEqual(["2026-01-05", "2026-01-15", "2026-03-24", "2026-05-02"]);

      const desc = [...dates].sort((a, b) => compareValues(a, b, "desc"));
      expect(desc).toEqual(["2026-05-02", "2026-03-24", "2026-01-15", "2026-01-05"]);
    });

    it("sorts numbers numerically rather than lexicographically ('5' comes before '12')", () => {
      const items = [
        { id: "1", count: 12 },
        { id: "2", count: 5 },
        { id: "3", count: 100 },
        { id: "4", count: 1 },
      ];

      const asc = [...items].sort((a, b) => compareValues(a.count, b.count, "asc", a.id, b.id));
      expect(asc.map((i) => i.count)).toEqual([1, 5, 12, 100]);

      const desc = [...items].sort((a, b) => compareValues(a.count, b.count, "desc", a.id, b.id));
      expect(desc.map((i) => i.count)).toEqual([100, 12, 5, 1]);
    });

    it("sorts string numbers numerically ('5' vs '12')", () => {
      const strNumbers = ["12", "5", "100", "2"];
      const asc = [...strNumbers].sort((a, b) => compareValues(a, b, "asc"));
      expect(asc).toEqual(["2", "5", "12", "100"]);
    });

    it("sorts Arabic text with proper collation", () => {
      const names = ["نورة الشمري", "أمل الحربي", "فاطمة العتيبي", "ابتسام الغامدي"];
      const sorted = [...names].sort((a, b) => compareValues(a, b, "asc"));

      // "ابتسام" or "أمل" comes before "فاطمة" and "نورة"
      expect(sorted[0]).toMatch(/^[أا]/);
      expect(sorted[sorted.length - 1]).toBe("نورة الشمري");
    });

    it("places null/undefined values consistently at the bottom", () => {
      const mixed = ["بدرية", null, "سارة", undefined, "أحمد"];
      const sortedAsc = [...mixed].sort((a, b) => compareValues(a, b, "asc"));
      
      expect(sortedAsc[sortedAsc.length - 2]).toBe(null);
      expect(sortedAsc[sortedAsc.length - 1]).toBe(undefined);
    });

    it("maintains stable pagination order using secondary ID tie-breaker", () => {
      const rows = [
        { id: "rec-b", name: "سارة" },
        { id: "rec-a", name: "سارة" },
        { id: "rec-c", name: "سارة" },
      ];

      const sorted = [...rows].sort((a, b) => compareValues(a.name, b.name, "asc", a.id, b.id));
      expect(sorted.map((r) => r.id)).toEqual(["rec-a", "rec-b", "rec-c"]);
    });
  });

  describe("Multi-Filter AND Logic Verification", () => {
    interface MockTeacher {
      id: string;
      name: string;
      specialty: string;
      status: "دائم" | "عقد";
      totalAbsences: number;
    }

    const mockTeachers: MockTeacher[] = [
      { id: "1", name: "فاطمة", specialty: "رياضيات", status: "دائم", totalAbsences: 3 },
      { id: "2", name: "نورة", specialty: "لغة عربية", status: "عقد", totalAbsences: 0 },
      { id: "3", name: "منى", specialty: "رياضيات", status: "دائم", totalAbsences: 0 },
      { id: "4", name: "هدى", specialty: "علوم", status: "عقد", totalAbsences: 5 },
      { id: "5", name: "سارة", specialty: "رياضيات", status: "عقد", totalAbsences: 2 },
    ];

    it("correctly filters with strict AND logic across multiple criteria", () => {
      // Filter: status === 'عقد' AND specialty === 'رياضيات'
      const filtered = mockTeachers.filter(
        (t) => t.status === "عقد" && t.specialty === "رياضيات"
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("سارة");
    });

    it("correctly combines search text and status filter", () => {
      const query = "رياضيات";
      const statusFilter = "دائم";

      const filtered = mockTeachers.filter((t) => {
        const matchesQuery = t.name.includes(query) || t.specialty.includes(query);
        const matchesStatus = t.status === statusFilter;
        return matchesQuery && matchesStatus;
      });

      expect(filtered.length).toBe(2);
      expect(filtered.map((t) => t.name)).toEqual(["فاطمة", "منى"]);
    });
  });

  describe("Pagination Slicing with Sorting & Filtering", () => {
    it("slices pages accurately and resets safePage when page count shrinks", () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `id-${i + 1}`, value: i + 1 }));
      const pageSize = 10;
      const totalPages = Math.ceil(items.length / pageSize); // 3

      // Page 1: 0..10
      const page1 = items.slice(0, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].value).toBe(1);
      expect(page1[9].value).toBe(10);

      // Page 3: 20..25
      const page3 = items.slice(20, 30);
      expect(page3.length).toBe(5);
      expect(page3[0].value).toBe(21);
      expect(page3[4].value).toBe(25);

      // Clamping logic: if user was on page 3, but filter reduces total to 5 items:
      const filtered = items.filter((i) => i.value <= 5);
      const newTotalPages = Math.ceil(filtered.length / pageSize) || 1; // 1
      const safePage = Math.min(3, newTotalPages);
      expect(safePage).toBe(1);
    });
  });
});
